package httpx

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/erikyryan/toolbox/server/internal/archive"
	"github.com/erikyryan/toolbox/server/internal/bomb"
	"github.com/erikyryan/toolbox/server/internal/logging"
	"github.com/erikyryan/toolbox/server/internal/spool"
)

func newService(t *testing.T) *Service {
	t.Helper()
	return &Service{
		Log: logging.New(),
		SpoolLimits: spool.Limits{
			MemoryMax:  1 << 20,
			RequestMax: 8 << 20,
			SpoolDir:   t.TempDir(),
		},
		BombLimits: bomb.DefaultLimits(),
	}
}

func multipartBody(t *testing.T, files map[string]string) (io.Reader, string) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	for name, content := range files {
		part, err := writer.CreateFormFile("file", name)
		if err != nil {
			t.Fatalf("CreateFormFile: %v", err)
		}
		if _, err := io.WriteString(part, content); err != nil {
			t.Fatalf("WriteString: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}

	return &body, writer.FormDataContentType()
}

func TestCabecalhosDeNaoCacheEmTodaResposta(t *testing.T) {
	service := newService(t)
	handler := Chain(service.Routes(), NoStore)

	for _, target := range []string{"/healthz", "/v1/compress?format=zip"} {
		method := http.MethodGet
		if strings.HasPrefix(target, "/v1") {
			method = http.MethodPost
		}

		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(method, target, nil))

		want := map[string]string{
			"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
			"Pragma":        "no-cache",
			"Expires":       "0",
		}
		for header, expected := range want {
			if got := recorder.Header().Get(header); got != expected {
				t.Errorf("%s: %s = %q, esperado %q", target, header, got, expected)
			}
		}
	}
}

func TestCompressDevolveArquivoValido(t *testing.T) {
	service := newService(t)
	body, contentType := multipartBody(t, map[string]string{"a.txt": "conteúdo do toolbox"})

	request := httptest.NewRequest(http.MethodPost, "/v1/compress?format=zip&preset=balanced", body)
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()

	service.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d: %s", recorder.Code, recorder.Body.String())
	}
	if got := recorder.Header().Get("Content-Type"); got != "application/zip" {
		t.Errorf("Content-Type = %q", got)
	}

	data := recorder.Body.Bytes()
	if format, ok := archive.Detect(data); !ok || format != archive.Zip {
		t.Errorf("a saída não é um ZIP reconhecível (formato=%s ok=%v)", format, ok)
	}
}

func TestCompressRecusaFormatoSomenteLeitura(t *testing.T) {
	service := newService(t)
	body, contentType := multipartBody(t, map[string]string{"a.txt": "x"})

	request := httptest.NewRequest(http.MethodPost, "/v1/compress?format=rar", body)
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()

	service.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Errorf("status = %d, esperado 400", recorder.Code)
	}
}

func TestInspectEExtractFazemOCicloCompleto(t *testing.T) {
	service := newService(t)
	content := "conteúdo do arquivo A"

	body, contentType := multipartBody(t, map[string]string{"a.txt": content})
	compressRequest := httptest.NewRequest(http.MethodPost, "/v1/compress?format=zip", body)
	compressRequest.Header.Set("Content-Type", contentType)
	compressed := httptest.NewRecorder()
	service.Routes().ServeHTTP(compressed, compressRequest)

	if compressed.Code != http.StatusOK {
		t.Fatalf("compress: status %d", compressed.Code)
	}
	packed := compressed.Body.Bytes()

	inspectRequest := httptest.NewRequest(http.MethodPost, "/v1/inspect", bytes.NewReader(packed))
	inspected := httptest.NewRecorder()
	service.Routes().ServeHTTP(inspected, inspectRequest)

	if inspected.Code != http.StatusOK {
		t.Fatalf("inspect: status %d: %s", inspected.Code, inspected.Body.String())
	}

	var listing archive.Listing
	if err := json.Unmarshal(inspected.Body.Bytes(), &listing); err != nil {
		t.Fatalf("resposta de inspect não é JSON: %v", err)
	}
	if len(listing.Entries) != 1 || listing.Entries[0].Name != "a.txt" {
		t.Fatalf("listagem inesperada: %+v", listing.Entries)
	}

	extractRequest := httptest.NewRequest(http.MethodPost, "/v1/extract?entry=a.txt", bytes.NewReader(packed))
	extracted := httptest.NewRecorder()
	service.Routes().ServeHTTP(extracted, extractRequest)

	if extracted.Code != http.StatusOK {
		t.Fatalf("extract: status %d", extracted.Code)
	}
	if extracted.Body.String() != content {
		t.Errorf("conteúdo extraído = %q, esperado %q", extracted.Body.String(), content)
	}
}

func TestFormatoDesconhecidoDa415(t *testing.T) {
	service := newService(t)
	request := httptest.NewRequest(http.MethodPost, "/v1/inspect", strings.NewReader("nem de longe um arquivo"))
	recorder := httptest.NewRecorder()

	service.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnsupportedMediaType {
		t.Errorf("status = %d, esperado 415", recorder.Code)
	}
}

func TestLimiteDeTamanhoDa413AntesDeLer(t *testing.T) {
	service := newService(t)
	handler := Chain(service.Routes(), MaxBytes(64))

	request := httptest.NewRequest(http.MethodPost, "/v1/inspect", strings.NewReader(strings.Repeat("x", 4096)))
	request.ContentLength = 4096
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("status = %d, esperado 413", recorder.Code)
	}
}

func TestRateLimiterRecusaExcesso(t *testing.T) {
	limiter := NewRateLimiter(60, 2)
	now := time.Now()

	if !limiter.Allow("origem", now) || !limiter.Allow("origem", now) {
		t.Fatal("as duas primeiras requisições deveriam passar")
	}
	if limiter.Allow("origem", now) {
		t.Error("a terceira requisição deveria ser recusada")
	}
	if !limiter.Allow("outra-origem", now) {
		t.Error("outra origem não deveria ser afetada")
	}
	// O balde reenche com o tempo.
	if !limiter.Allow("origem", now.Add(2*time.Second)) {
		t.Error("depois de dois segundos deveria haver token de novo")
	}
}

func TestRateLimiterRespondeCom429ERetryAfter(t *testing.T) {
	limiter := NewRateLimiter(60, 1)
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	first := httptest.NewRecorder()
	handler.ServeHTTP(first, httptest.NewRequest(http.MethodGet, "/", nil))

	second := httptest.NewRecorder()
	handler.ServeHTTP(second, httptest.NewRequest(http.MethodGet, "/", nil))

	if second.Code != http.StatusTooManyRequests {
		t.Errorf("status = %d, esperado 429", second.Code)
	}
	if second.Header().Get("Retry-After") == "" {
		t.Error("faltou o cabeçalho Retry-After")
	}
}

func TestRateLimiterIgnoraForwardedForEnviadoPeloCliente(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.RemoteAddr = "198.51.100.7:44321"
	request.Header.Set("X-Forwarded-For", "203.0.113.99")

	if got := clientIP(request); got != "198.51.100.7" {
		t.Errorf("clientIP = %q, esperado endereço remoto", got)
	}
}

func TestSemaforoDa503QuandoSatura(t *testing.T) {
	release := make(chan struct{})
	busy := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release
		w.WriteHeader(http.StatusOK)
	})
	handler := Semaphore(1, 50*time.Millisecond)(busy)

	started := make(chan struct{})
	go func() {
		close(started)
		handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	}()
	<-started
	time.Sleep(20 * time.Millisecond)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))
	close(release)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, esperado 503", recorder.Code)
	}
	if recorder.Header().Get("Retry-After") == "" {
		t.Error("faltou o cabeçalho Retry-After no 503")
	}
}

func TestTimeoutCancelaOContexto(t *testing.T) {
	handler := Timeout(20 * time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-r.Context().Done():
			Error(w, http.StatusGatewayTimeout, "a operação passou do tempo limite")
		case <-time.After(2 * time.Second):
			w.WriteHeader(http.StatusOK)
		}
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusGatewayTimeout {
		t.Errorf("status = %d, esperado 504", recorder.Code)
	}
}

func TestRecoverNaoDerrubaOProcesso(t *testing.T) {
	handler := Recover(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("falha inesperada")
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, esperado 500", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "falha inesperada") {
		t.Error("a resposta vazou o detalhe interno do pânico")
	}
}

func TestErroNaoEcoaNomeDeArquivoNemConteudo(t *testing.T) {
	service := newService(t)
	secret := "conteudo-secreto-do-usuario"
	body, contentType := multipartBody(t, map[string]string{"nome-secreto.txt": secret})

	request := httptest.NewRequest(http.MethodPost, "/v1/compress?format=formato-que-nao-existe", body)
	request.Header.Set("Content-Type", contentType)
	recorder := httptest.NewRecorder()

	service.Routes().ServeHTTP(recorder, request)

	response := recorder.Body.String()
	if strings.Contains(response, "nome-secreto.txt") || strings.Contains(response, secret) {
		t.Errorf("a resposta de erro vazou nome ou conteúdo: %q", response)
	}
}

func TestNomeDeEntradaESaneado(t *testing.T) {
	cases := map[string]string{
		"../../etc/passwd":   "etc/passwd",
		"/absoluto/a.txt":    "absoluto/a.txt",
		"pasta\\windows.txt": "pasta/windows.txt",
		"":                   "arquivo-1",
		"./a.txt":            "a.txt",
	}

	for input, expected := range cases {
		if got := sanitizeName(input, 0); got != expected {
			t.Errorf("sanitizeName(%q) = %q, esperado %q", input, got, expected)
		}
	}
}

// TestLogNaoCarregaNomeNemConteudo roda uma operação de verdade com nome e
// conteúdo distintivos e lê o que foi emitido. É a checagem de ponta a ponta
// da política de logs — a de forma está em logging.
func TestLogNaoCarregaNomeNemConteudo(t *testing.T) {
	var emitted bytes.Buffer
	service := newService(t)
	service.Log = logging.NewWithWriter(&emitted)

	const secretName = "planilha-confidencial-2026.txt"
	const secretContent = "salario;valor\ndiretoria;999999"

	body, contentType := multipartBody(t, map[string]string{secretName: secretContent})
	request := httptest.NewRequest(http.MethodPost, "/v1/compress?format=zip", body)
	request.Header.Set("Content-Type", contentType)
	service.Routes().ServeHTTP(httptest.NewRecorder(), request)

	logged := emitted.String()
	if logged == "" {
		t.Fatal("nenhum log foi emitido")
	}
	if strings.Contains(logged, secretName) {
		t.Errorf("o log carregou o nome do arquivo: %s", logged)
	}
	if strings.Contains(logged, "confidencial") || strings.Contains(logged, "999999") {
		t.Errorf("o log carregou conteúdo do usuário: %s", logged)
	}
	// E o que precisa estar lá, está.
	for _, expected := range []string{`"operation":"compress"`, `"format":"zip"`, `"bytes_in"`, `"duration_ms"`, `"status":200`} {
		if !strings.Contains(logged, expected) {
			t.Errorf("faltou o metadado %s no log: %s", expected, logged)
		}
	}
}

// TestNadaSobraNoSpoolDepoisDeErro cobre o caminho de falha: um arquivo grande
// o bastante para ir à camada B, mas corrompido, não pode deixar rastro.
func TestNadaSobraNoSpoolDepoisDeErro(t *testing.T) {
	dir := t.TempDir()
	service := &Service{
		Log:         logging.NewWithWriter(io.Discard),
		SpoolLimits: spool.Limits{MemoryMax: 512, RequestMax: 8 << 20, SpoolDir: dir},
		BombLimits:  bomb.DefaultLimits(),
	}

	// Assinatura de GZIP seguida de lixo: passa da camada A, falha ao extrair.
	corrupted := append([]byte{0x1f, 0x8b, 0x08}, bytes.Repeat([]byte{0xff}, 4096)...)

	request := httptest.NewRequest(http.MethodPost, "/v1/extract", bytes.NewReader(corrupted))
	recorder := httptest.NewRecorder()
	service.Routes().ServeHTTP(recorder, request)

	if recorder.Code == http.StatusOK {
		t.Fatal("esperava falha para arquivo corrompido")
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("sobrou %d arquivo(s) no spool depois do erro", len(entries))
	}
}
