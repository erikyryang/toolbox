package httpx

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/erikyryan/toolbox/server/internal/archive"
	"github.com/erikyryan/toolbox/server/internal/bomb"
	"github.com/erikyryan/toolbox/server/internal/logging"
	"github.com/erikyryan/toolbox/server/internal/spool"
)

// Service reúne os handlers de compactação.
type Service struct {
	Log         *logging.Logger
	SpoolLimits spool.Limits
	BombLimits  bomb.Limits
}

// Routes monta o mux do serviço.
func (s *Service) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /v1/compress", s.handleCompress)
	mux.HandleFunc("POST /v1/inspect", s.handleInspect)
	mux.HandleFunc("POST /v1/extract", s.handleExtract)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	return mux
}

// handleCompress prepara o resultado inteiro no staging antes de iniciar a
// resposta. Isso permite devolver um erro HTTP normal se o codec falhar, em
// vez de um download 200 truncado.
func (s *Service) handleCompress(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	event := logging.Event{Operation: "compress"}

	format := archive.Format(r.URL.Query().Get("format"))
	spec, err := archive.Lookup(format)
	if err != nil {
		s.fail(w, &event, start, http.StatusBadRequest, "formato_desconhecido", "formato não suportado")
		return
	}
	event.Format = string(format)

	if !spec.CanCompress {
		s.fail(w, &event, start, http.StatusBadRequest, "somente_leitura",
			fmt.Sprintf("%s é apenas leitura: não há compressor livre para este formato", format))
		return
	}

	level := archive.LevelFor(spec, presetOf(r), customLevel(r))
	event.Level = level

	reader, err := multipartReader(r)
	if err != nil {
		s.fail(w, &event, start, http.StatusBadRequest, "multipart_invalido", err.Error())
		return
	}

	sources, cleanup, err := s.collect(r.Context(), reader, spec)
	defer cleanup()
	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}
	for _, source := range sources {
		event.BytesIn += source.Size
	}

	output, err := newStagedOutput(s.SpoolLimits.SpoolDir)
	if err != nil {
		s.fail(w, &event, start, http.StatusServiceUnavailable, "spool_indisponivel", "a área temporária do serviço não está disponível")
		return
	}
	defer output.Close()

	written, err := archive.Compress(contextWriter{ctx: r.Context(), Writer: output}, format, level, sources)
	event.BytesOut = written
	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}

	w.Header().Set("Content-Type", spec.MediaType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="arquivo%s"`, spec.Extension))
	if _, err := output.CopyTo(contextWriter{ctx: r.Context(), Writer: w}); err != nil {
		event.Status = 499 // cliente fechou a conexão antes de receber a resposta
		event.Outcome = "cliente_desconectado"
		event.DurationMS = logging.Since(start)
		s.Log.Operation(event)
		return
	}

	event.Status = http.StatusOK
	event.DurationMS = logging.Since(start)
	s.Log.Operation(event)
}

// handleInspect devolve o índice do arquivo, sem extrair conteúdo.
func (s *Service) handleInspect(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	event := logging.Event{Operation: "inspect"}

	buffered, format, err := s.readArchive(r)
	if buffered != nil {
		defer buffered.Close()
	}
	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}
	event.Format = string(format)
	event.BytesIn = buffered.Size()

	guard := bomb.New(buffered.Size(), s.BombLimits)
	listing, err := archive.List(
		archive.ReaderAtSource{ReaderAt: contextReaderAt{ctx: r.Context(), ReaderAt: buffered.ReaderAt()}, Size: buffered.Size()},
		format, guard,
	)
	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}

	event.Status = http.StatusOK
	event.DurationMS = logging.Since(start)
	s.Log.Operation(event)
	JSON(w, http.StatusOK, listing)
}

// handleExtract escreve o conteúdo de uma entrada na resposta.
func (s *Service) handleExtract(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	event := logging.Event{Operation: "extract"}

	buffered, format, err := s.readArchive(r)
	if buffered != nil {
		defer buffered.Close()
	}
	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}
	event.Format = string(format)
	event.BytesIn = buffered.Size()

	guard := bomb.New(buffered.Size(), s.BombLimits)
	output, err := newStagedOutput(s.SpoolLimits.SpoolDir)
	if err != nil {
		s.fail(w, &event, start, http.StatusServiceUnavailable, "spool_indisponivel", "a área temporária do serviço não está disponível")
		return
	}
	defer output.Close()

	written, err := archive.Extract(
		contextWriter{ctx: r.Context(), Writer: output},
		archive.ReaderAtSource{ReaderAt: contextReaderAt{ctx: r.Context(), ReaderAt: buffered.ReaderAt()}, Size: buffered.Size()},
		format, r.URL.Query().Get("entry"), guard,
	)
	event.BytesOut = written

	if err != nil {
		s.failFromError(w, &event, start, err)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="conteudo"`)
	if _, err := output.CopyTo(contextWriter{ctx: r.Context(), Writer: w}); err != nil {
		event.Status = 499 // cliente fechou a conexão antes de receber a resposta
		event.Outcome = "cliente_desconectado"
		event.DurationMS = logging.Since(start)
		s.Log.Operation(event)
		return
	}

	event.Status = http.StatusOK
	event.DurationMS = logging.Since(start)
	s.Log.Operation(event)
}

// readArchive materializa o corpo e detecta o formato.
//
// É aqui que o trade-off central aparece: ZIP, RAR e 7Z guardam o índice no
// fim, então precisam de io.ReaderAt, e o spool é quem o oferece — memória
// para o caso comum, tmpfs sem nome para o caso grande.
func (s *Service) readArchive(r *http.Request) (*spool.Spool, archive.Format, error) {
	body, err := singleBody(r)
	if err != nil {
		return nil, "", err
	}

	buffered, err := spool.Open(contextReader{ctx: r.Context(), Reader: body}, s.SpoolLimits)
	if err != nil {
		return nil, "", err
	}

	head := make([]byte, 512)
	read, err := buffered.ReaderAt().ReadAt(head, 0)
	if err != nil && !errors.Is(err, io.EOF) {
		buffered.Close()
		return nil, "", err
	}

	format, ok := archive.Detect(head[:read])
	if !ok {
		return buffered, "", errUnknownFormat
	}

	return buffered, format, nil
}

var errUnknownFormat = errors.New("formato não identificado pela assinatura do arquivo")

// singleBody devolve o corpo, aceitando tanto envio direto quanto multipart.
func singleBody(r *http.Request) (io.Reader, error) {
	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "multipart/") {
		return r.Body, nil
	}

	reader, err := multipartReader(r)
	if err != nil {
		return nil, err
	}

	part, err := reader.NextPart()
	if err != nil {
		return nil, errors.New("nenhum arquivo enviado")
	}
	return part, nil
}

func multipartReader(r *http.Request) (*multipart.Reader, error) {
	contentType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || !strings.HasPrefix(contentType, "multipart/") {
		return nil, errors.New("esperado multipart/form-data")
	}
	boundary, ok := params["boundary"]
	if !ok {
		return nil, errors.New("multipart sem boundary")
	}
	return multipart.NewReader(r.Body, boundary), nil
}

// collect lê as partes do multipart.
//
// Formatos sequenciais são consumidos em streaming direto da parte. O TAR é a
// exceção: seu cabeçalho declara o tamanho antes do conteúdo, e o tamanho só
// é conhecido depois de ler a parte inteira — por isso essas entradas passam
// pelo spool.
func (s *Service) collect(ctx context.Context, reader *multipart.Reader, spec archive.Spec) ([]archive.Source, func(), error) {
	var (
		sources []archive.Source
		spools  []*spool.Spool
	)

	cleanup := func() {
		for _, buffered := range spools {
			buffered.Close()
		}
	}

	needsSize := spec.Container

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, cleanup, err
		}

		name := sanitizeName(part.FileName(), len(sources))

		if !needsSize {
			sources = append(sources, archive.Source{Name: name, Size: -1, Body: contextReader{ctx: ctx, Reader: part}})
			// Formatos de um só membro não leem além da primeira parte.
			break
		}

		buffered, err := spool.Open(part, s.SpoolLimits)
		if err != nil {
			return nil, cleanup, err
		}
		spools = append(spools, buffered)

		body, err := buffered.Reader()
		if err != nil {
			return nil, cleanup, err
		}
		sources = append(sources, archive.Source{Name: name, Size: buffered.Size(), Body: contextReader{ctx: ctx, Reader: body}})
	}

	if len(sources) == 0 {
		return nil, cleanup, errors.New("nenhum arquivo enviado")
	}

	return sources, cleanup, nil
}

// sanitizeName impede que o nome enviado escape do arquivo gerado. Nomes de
// arquivo são conteúdo do usuário: usados na saída, nunca em log.
func sanitizeName(name string, index int) string {
	name = strings.ReplaceAll(name, "\\", "/")
	name = strings.TrimLeft(name, "/")

	parts := make([]string, 0, 4)
	for _, part := range strings.Split(name, "/") {
		if part == "" || part == "." || part == ".." {
			continue
		}
		parts = append(parts, part)
	}

	if len(parts) == 0 {
		return fmt.Sprintf("arquivo-%d", index+1)
	}
	return strings.Join(parts, "/")
}

func presetOf(r *http.Request) archive.Preset {
	switch archive.Preset(r.URL.Query().Get("preset")) {
	case archive.Fast:
		return archive.Fast
	case archive.Max:
		return archive.Max
	case archive.Custom:
		return archive.Custom
	default:
		return archive.Balanced
	}
}

func customLevel(r *http.Request) int {
	level, err := strconv.Atoi(r.URL.Query().Get("level"))
	if err != nil {
		return 0
	}
	return level
}

func (s *Service) fail(w http.ResponseWriter, event *logging.Event, start time.Time, status int, outcome, message string) {
	event.Status = status
	event.Outcome = outcome
	event.DurationMS = logging.Since(start)
	s.Log.Operation(*event)
	Error(w, status, message)
}

// failFromError traduz o erro em status e mensagem, sem deixar detalhe interno
// nem trecho de conteúdo chegar à resposta.
func (s *Service) failFromError(w http.ResponseWriter, event *logging.Event, start time.Time, err error) {
	switch {
	case errors.Is(err, spool.ErrTooLarge):
		s.fail(w, event, start, http.StatusRequestEntityTooLarge, "grande_demais",
			"o arquivo passa do limite por requisição")

	case errors.Is(err, archive.ErrEncrypted):
		s.fail(w, event, start, http.StatusUnprocessableEntity, "criptografado",
			"arquivos protegidos por senha não são suportados")

	case errors.Is(err, archive.ErrUnsupported), errors.Is(err, errUnknownFormat):
		s.fail(w, event, start, http.StatusUnsupportedMediaType, "formato_desconhecido",
			"formato não suportado ou não identificado")

	case errors.Is(err, bomb.ErrBomb):
		s.fail(w, event, start, http.StatusUnprocessableEntity, "bomba",
			"a extração passou dos limites de expansão e foi interrompida")

	case errors.Is(err, syscall.ENOSPC), errors.Is(err, syscall.EDQUOT):
		w.Header().Set("Retry-After", "5")
		s.fail(w, event, start, http.StatusServiceUnavailable, "spool_cheio",
			"a área temporária compartilhada está cheia; tente novamente em instantes")

	case errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled):
		s.fail(w, event, start, http.StatusGatewayTimeout, "timeout",
			"a operação passou do tempo limite")

	default:
		var maxBytes *http.MaxBytesError
		if errors.As(err, &maxBytes) {
			s.fail(w, event, start, http.StatusRequestEntityTooLarge, "grande_demais",
				"o arquivo passa do limite por requisição")
			return
		}
		s.fail(w, event, start, http.StatusUnprocessableEntity, "falha_formato",
			"não foi possível processar o arquivo: ele parece inválido ou corrompido")
	}
}
