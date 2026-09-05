package archive

import (
	"archive/tar"
	"bytes"
	"compress/bzip2"
	"errors"
	"fmt"
	"io"

	"github.com/bodgit/sevenzip"
	"github.com/klauspost/compress/gzip"
	kzip "github.com/klauspost/compress/zip"
	"github.com/klauspost/compress/zstd"
	"github.com/nwaples/rardecode/v2"
	"github.com/ulikunitz/xz"

	"github.com/erikyryan/toolbox/server/internal/bomb"
)

// Entry descreve uma entrada do arquivo, sem revelar seu conteúdo.
type Entry struct {
	Name           string `json:"name"`
	Size           int64  `json:"size"`
	CompressedSize int64  `json:"compressedSize,omitempty"`
	Directory      bool   `json:"directory"`
}

// Listing é o índice de um arquivo.
type Listing struct {
	Format  Format  `json:"format"`
	Entries []Entry `json:"entries"`
	// Single marca formatos de um só membro, que não têm índice de verdade.
	Single bool `json:"single"`
}

// Source de leitura: ZIP, RAR e 7Z precisam de acesso aleatório, e é por isso
// que a camada HTTP materializa o corpo antes de chegar aqui.
type ReaderAtSource struct {
	ReaderAt io.ReaderAt
	Size     int64
}

// List lê o índice do arquivo sem extrair conteúdo.
func List(source ReaderAtSource, format Format, guard *bomb.Guard) (Listing, error) {
	switch format {
	case Zip:
		return listZip(source, guard)
	case Rar:
		return listRar(source, guard)
	case SevenZ:
		return listSevenZ(source, guard)
	case Tar:
		return listTar(io.NewSectionReader(source.ReaderAt, 0, source.Size), Tar, guard)
	case Gzip, Zstd, Xz, Bzip2:
		return listEnvelope(source, format, guard)
	default:
		return Listing{}, fmt.Errorf("%w: %s", ErrUnsupported, format)
	}
}

func listZip(source ReaderAtSource, guard *bomb.Guard) (Listing, error) {
	reader, err := kzip.NewReader(source.ReaderAt, source.Size)
	if err != nil {
		return Listing{}, fmt.Errorf("ZIP inválido: %w", err)
	}

	entries := make([]Entry, 0, len(reader.File))
	for _, file := range reader.File {
		if isEncrypted(file.Flags) {
			return Listing{}, ErrEncrypted
		}
		if err := guard.CheckDeclared(int64(file.UncompressedSize64)); err != nil {
			return Listing{}, err
		}
		entries = append(entries, Entry{
			Name:           file.Name,
			Size:           int64(file.UncompressedSize64),
			CompressedSize: int64(file.CompressedSize64),
			Directory:      file.FileInfo().IsDir(),
		})
	}

	return Listing{Format: Zip, Entries: entries}, nil
}

func listRar(source ReaderAtSource, guard *bomb.Guard) (Listing, error) {
	reader, err := rardecode.NewReader(io.NewSectionReader(source.ReaderAt, 0, source.Size))
	if err != nil {
		return Listing{}, fmt.Errorf("RAR inválido: %w", err)
	}

	var entries []Entry
	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			if errors.Is(err, rardecode.ErrArchivedFileEncrypted) {
				return Listing{}, ErrEncrypted
			}
			return Listing{}, fmt.Errorf("RAR inválido: %w", err)
		}
		if err := guard.CheckDeclared(header.UnPackedSize); err != nil {
			return Listing{}, err
		}
		entries = append(entries, Entry{
			Name:      header.Name,
			Size:      header.UnPackedSize,
			Directory: header.IsDir,
		})
	}

	return Listing{Format: Rar, Entries: entries}, nil
}

func listSevenZ(source ReaderAtSource, guard *bomb.Guard) (Listing, error) {
	reader, err := sevenzip.NewReader(source.ReaderAt, source.Size)
	if err != nil {
		return Listing{}, fmt.Errorf("7Z inválido: %w", err)
	}

	entries := make([]Entry, 0, len(reader.File))
	for _, file := range reader.File {
		size := int64(file.UncompressedSize)
		if err := guard.CheckDeclared(size); err != nil {
			return Listing{}, err
		}
		entries = append(entries, Entry{
			Name:      file.Name,
			Size:      size,
			Directory: file.FileInfo().IsDir(),
		})
	}

	return Listing{Format: SevenZ, Entries: entries}, nil
}

func listTar(r io.Reader, format Format, guard *bomb.Guard) (Listing, error) {
	reader := tar.NewReader(r)
	var entries []Entry

	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return Listing{}, fmt.Errorf("TAR inválido: %w", err)
		}
		if err := guard.CheckDeclared(header.Size); err != nil {
			return Listing{}, err
		}
		entries = append(entries, Entry{
			Name:      header.Name,
			Size:      header.Size,
			Directory: header.FileInfo().IsDir(),
		})
	}

	return Listing{Format: format, Entries: entries}, nil
}

// listEnvelope trata os formatos de um só membro. Pode haver um TAR dentro, e
// nesse caso o índice de verdade é o do TAR.
func listEnvelope(source ReaderAtSource, format Format, guard *bomb.Guard) (Listing, error) {
	body := io.NewSectionReader(source.ReaderAt, 0, source.Size)
	inner, closer, err := openEnvelope(body, format)
	if err != nil {
		return Listing{}, err
	}
	defer closer()

	head := make([]byte, 512)
	read, err := io.ReadFull(inner, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return Listing{}, err
	}
	head = head[:read]

	// Um TAR se anuncia no deslocamento 257; para vê-lo é preciso o primeiro
	// bloco inteiro, que já foi lido acima.
	if len(head) >= 262 && string(head[257:262]) == "ustar" {
		combined := io.MultiReader(bytes.NewReader(head), inner)
		listing, err := listTar(combined, tarEnvelopeFormat(format), guard)
		if err != nil {
			return Listing{}, err
		}
		return listing, nil
	}

	// Sem TAR dentro: o tamanho só é conhecido lendo até o fim.
	size := int64(len(head))
	written, err := io.Copy(guard.Writer(io.Discard), inner)
	if err != nil {
		return Listing{}, err
	}
	size += written

	return Listing{
		Format:  format,
		Single:  true,
		Entries: []Entry{{Name: "conteudo", Size: size}},
	}, nil
}

func tarEnvelopeFormat(format Format) Format {
	switch format {
	case Gzip:
		return TarGz
	case Zstd:
		return TarZst
	default:
		return format
	}
}

// Extract escreve em w o conteúdo de uma entrada — ou o conteúdo único, para
// formatos sem índice.
func Extract(w io.Writer, source ReaderAtSource, format Format, entryName string, guard *bomb.Guard) (int64, error) {
	guarded := guard.Writer(w)

	switch format {
	case Zip:
		return extractZip(guarded, source, entryName)
	case Rar:
		return extractRar(guarded, source, entryName)
	case SevenZ:
		return extractSevenZ(guarded, source, entryName)
	case Tar:
		return extractTar(guarded, io.NewSectionReader(source.ReaderAt, 0, source.Size), entryName)
	case Gzip, Zstd, Xz, Bzip2:
		return extractEnvelope(guarded, source, format, entryName)
	default:
		return 0, fmt.Errorf("%w: %s", ErrUnsupported, format)
	}
}

func extractZip(w io.Writer, source ReaderAtSource, entryName string) (int64, error) {
	reader, err := kzip.NewReader(source.ReaderAt, source.Size)
	if err != nil {
		return 0, fmt.Errorf("ZIP inválido: %w", err)
	}

	for _, file := range reader.File {
		if entryName != "" && file.Name != entryName {
			continue
		}
		if isEncrypted(file.Flags) {
			return 0, ErrEncrypted
		}
		if file.FileInfo().IsDir() {
			continue
		}

		content, err := file.Open()
		if err != nil {
			return 0, err
		}
		defer content.Close()
		return io.Copy(w, content)
	}

	return 0, errEntryNotFound(entryName)
}

func extractRar(w io.Writer, source ReaderAtSource, entryName string) (int64, error) {
	reader, err := rardecode.NewReader(io.NewSectionReader(source.ReaderAt, 0, source.Size))
	if err != nil {
		return 0, fmt.Errorf("RAR inválido: %w", err)
	}

	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			if errors.Is(err, rardecode.ErrArchivedFileEncrypted) {
				return 0, ErrEncrypted
			}
			return 0, fmt.Errorf("RAR inválido: %w", err)
		}
		if header.IsDir || (entryName != "" && header.Name != entryName) {
			continue
		}
		return io.Copy(w, reader)
	}

	return 0, errEntryNotFound(entryName)
}

func extractSevenZ(w io.Writer, source ReaderAtSource, entryName string) (int64, error) {
	reader, err := sevenzip.NewReader(source.ReaderAt, source.Size)
	if err != nil {
		return 0, fmt.Errorf("7Z inválido: %w", err)
	}

	for _, file := range reader.File {
		if file.FileInfo().IsDir() || (entryName != "" && file.Name != entryName) {
			continue
		}
		content, err := file.Open()
		if err != nil {
			return 0, err
		}
		defer content.Close()
		return io.Copy(w, content)
	}

	return 0, errEntryNotFound(entryName)
}

func extractTar(w io.Writer, r io.Reader, entryName string) (int64, error) {
	reader := tar.NewReader(r)

	for {
		header, err := reader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("TAR inválido: %w", err)
		}
		if header.FileInfo().IsDir() || (entryName != "" && header.Name != entryName) {
			continue
		}
		return io.Copy(w, reader)
	}

	return 0, errEntryNotFound(entryName)
}

func extractEnvelope(w io.Writer, source ReaderAtSource, format Format, entryName string) (int64, error) {
	body := io.NewSectionReader(source.ReaderAt, 0, source.Size)
	inner, closer, err := openEnvelope(body, format)
	if err != nil {
		return 0, err
	}
	defer closer()

	if entryName == "" {
		return io.Copy(w, inner)
	}

	// Nome de entrada só faz sentido quando há um TAR dentro do envelope.
	return extractTar(w, inner, entryName)
}

// openEnvelope abre o descompressor de um formato sequencial. Todos eles são
// streaming de verdade: memória constante, independente do tamanho.
func openEnvelope(r io.Reader, format Format) (io.Reader, func(), error) {
	switch format {
	case Gzip, TarGz:
		reader, err := gzip.NewReader(r)
		if err != nil {
			return nil, nil, fmt.Errorf("GZIP inválido: %w", err)
		}
		return reader, func() { reader.Close() }, nil

	case Zstd, TarZst:
		reader, err := zstd.NewReader(r)
		if err != nil {
			return nil, nil, fmt.Errorf("ZSTD inválido: %w", err)
		}
		return reader, reader.Close, nil

	case Xz:
		reader, err := xz.NewReader(r)
		if err != nil {
			return nil, nil, fmt.Errorf("XZ inválido: %w", err)
		}
		return reader, func() {}, nil

	case Bzip2:
		return bzip2.NewReader(r), func() {}, nil

	default:
		return nil, nil, fmt.Errorf("%w: %s", ErrUnsupported, format)
	}
}

// isEncrypted lê o bit 0 dos flags gerais do ZIP, que marca entrada protegida
// por senha.
func isEncrypted(flags uint16) bool {
	return flags&0x1 != 0
}

func errEntryNotFound(entryName string) error {
	if entryName == "" {
		return errors.New("o arquivo não tem nenhuma entrada extraível")
	}
	// A mensagem não ecoa o nome enviado: ele é conteúdo do usuário.
	return errors.New("a entrada pedida não existe no arquivo")
}
