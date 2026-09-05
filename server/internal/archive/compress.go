package archive

import (
	"archive/tar"
	"fmt"
	"io"
	"time"

	dsnetbzip2 "github.com/dsnet/compress/bzip2"
	"github.com/klauspost/compress/gzip"
	kzip "github.com/klauspost/compress/zip"
	"github.com/klauspost/compress/zstd"
	"github.com/ulikunitz/xz"
)

// Source é um arquivo de entrada para a compactação. O conteúdo chega como
// io.Reader: nada é materializado só para ser comprimido.
type Source struct {
	Name string
	Size int64
	Body io.Reader
}

// Compress escreve o arquivo compactado em w, lendo as fontes em streaming.
//
// Escrever é o caso feliz e assimétrico do problema de índice: ZIP e TAR
// gravam o índice conforme avançam, então criar qualquer formato suportado
// custa memória constante. A restrição de buffer vale só para *ler* ZIP,
// RAR e 7Z.
func Compress(w io.Writer, format Format, level int, sources []Source) (int64, error) {
	spec, err := Lookup(format)
	if err != nil {
		return 0, err
	}
	if !spec.CanCompress {
		return 0, fmt.Errorf("%w: %s é apenas leitura", ErrUnsupported, format)
	}
	if len(sources) == 0 {
		return 0, fmt.Errorf("nenhum arquivo enviado")
	}

	counter := &countingWriter{inner: w}
	level = ClampLevel(spec, level)

	switch format {
	case Zip:
		err = writeZip(counter, level, sources)
	case Tar:
		err = writeTar(counter, sources)
	case Gzip:
		err = withGzip(counter, level, func(inner io.Writer) error {
			return copySingle(inner, sources)
		})
	case Zstd:
		err = withZstd(counter, level, func(inner io.Writer) error {
			return copySingle(inner, sources)
		})
	case Xz:
		err = withXz(counter, func(inner io.Writer) error {
			return copySingle(inner, sources)
		})
	case Bzip2:
		err = withBzip2(counter, level, func(inner io.Writer) error {
			return copySingle(inner, sources)
		})
	case TarGz:
		err = withGzip(counter, level, func(inner io.Writer) error {
			return writeTar(inner, sources)
		})
	case TarZst:
		err = withZstd(counter, level, func(inner io.Writer) error {
			return writeTar(inner, sources)
		})
	default:
		err = fmt.Errorf("%w: %s", ErrUnsupported, format)
	}

	return counter.written, err
}

func copySingle(w io.Writer, sources []Source) error {
	if len(sources) != 1 {
		return fmt.Errorf("este formato comprime um arquivo por vez; foram enviados %d", len(sources))
	}
	_, err := io.Copy(w, sources[0].Body)
	return err
}

func writeTar(w io.Writer, sources []Source) error {
	writer := tar.NewWriter(w)

	for _, source := range sources {
		// O TAR precisa do tamanho antes do conteúdo. Quando ele não é
		// conhecido de antemão, a entrada não pode ser escrita em streaming —
		// e é por isso que o tamanho vem junto da fonte.
		if source.Size < 0 {
			return fmt.Errorf("tamanho desconhecido impede escrever a entrada em TAR")
		}

		header := &tar.Header{
			Name:     source.Name,
			Mode:     0o644,
			Size:     source.Size,
			ModTime:  time.Now(),
			Typeflag: tar.TypeReg,
			Format:   tar.FormatPAX,
		}
		if err := writer.WriteHeader(header); err != nil {
			return err
		}
		if _, err := io.Copy(writer, source.Body); err != nil {
			return err
		}
	}

	return writer.Close()
}

func writeZip(w io.Writer, level int, sources []Source) error {
	writer := kzip.NewWriter(w)
	writer.RegisterCompressor(kzip.Deflate, func(out io.Writer) (io.WriteCloser, error) {
		return newFlateWriter(out, level)
	})

	for _, source := range sources {
		method := kzip.Deflate
		if level == 0 {
			method = kzip.Store
		}

		entry, err := writer.CreateHeader(&kzip.FileHeader{
			Name:     source.Name,
			Method:   method,
			Modified: time.Now(),
		})
		if err != nil {
			return err
		}
		if _, err := io.Copy(entry, source.Body); err != nil {
			return err
		}
	}

	return writer.Close()
}

func withGzip(w io.Writer, level int, write func(io.Writer) error) error {
	writer, err := gzip.NewWriterLevel(w, level)
	if err != nil {
		return err
	}
	if err := write(writer); err != nil {
		writer.Close()
		return err
	}
	return writer.Close()
}

func withZstd(w io.Writer, level int, write func(io.Writer) error) error {
	writer, err := zstd.NewWriter(w, zstd.WithEncoderLevel(zstdLevel(level)))
	if err != nil {
		return err
	}
	if err := write(writer); err != nil {
		writer.Close()
		return err
	}
	return writer.Close()
}

func withXz(w io.Writer, write func(io.Writer) error) error {
	writer, err := xz.NewWriter(w)
	if err != nil {
		return err
	}
	if err := write(writer); err != nil {
		writer.Close()
		return err
	}
	return writer.Close()
}

func withBzip2(w io.Writer, level int, write func(io.Writer) error) error {
	writer, err := dsnetbzip2.NewWriter(w, &dsnetbzip2.WriterConfig{Level: level})
	if err != nil {
		return err
	}
	if err := write(writer); err != nil {
		writer.Close()
		return err
	}
	return writer.Close()
}

// zstdLevel mapeia o nível numérico (1–22) para os degraus da biblioteca.
func zstdLevel(level int) zstd.EncoderLevel {
	switch {
	case level <= 2:
		return zstd.SpeedFastest
	case level <= 6:
		return zstd.SpeedDefault
	case level <= 11:
		return zstd.SpeedBetterCompression
	default:
		return zstd.SpeedBestCompression
	}
}

type countingWriter struct {
	inner   io.Writer
	written int64
}

func (w *countingWriter) Write(p []byte) (int, error) {
	n, err := w.inner.Write(p)
	w.written += int64(n)
	return n, err
}
