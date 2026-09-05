package httpx

import (
	"context"
	"io"
	"os"
)

// contextReader interrompe a próxima leitura quando a requisição vence. Os
// codecs trabalham sobre io.Reader; este adaptador propaga o prazo sem
// acoplar o pacote archive à camada HTTP.
type contextReader struct {
	ctx context.Context
	io.Reader
}

func (r contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.Reader.Read(p)
}

type contextReaderAt struct {
	ctx context.Context
	io.ReaderAt
}

func (r contextReaderAt) ReadAt(p []byte, off int64) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.ReaderAt.ReadAt(p, off)
}

type contextWriter struct {
	ctx context.Context
	io.Writer
}

func (w contextWriter) Write(p []byte) (int, error) {
	if err := w.ctx.Err(); err != nil {
		return 0, err
	}
	return w.Writer.Write(p)
}

// stagedOutput mantém a resposta em um inode sem nome até que o codec termine.
// Assim, uma falha durante a leitura ou compactação ainda pode virar um erro
// HTTP normal, em vez de um download 200 truncado. O arquivo vive apenas na
// tmpfs de spool e desaparece ao fechar o descritor.
type stagedOutput struct {
	file *os.File
}

func newStagedOutput(dir string) (*stagedOutput, error) {
	file, err := os.CreateTemp(dir, "toolbox-output-*")
	if err != nil {
		return nil, err
	}
	if err := os.Remove(file.Name()); err != nil {
		file.Close()
		return nil, err
	}
	return &stagedOutput{file: file}, nil
}

func (s *stagedOutput) Write(p []byte) (int, error) { return s.file.Write(p) }

func (s *stagedOutput) CopyTo(w io.Writer) (int64, error) {
	if _, err := s.file.Seek(0, io.SeekStart); err != nil {
		return 0, err
	}
	return io.Copy(w, s.file)
}

func (s *stagedOutput) Close() error { return s.file.Close() }
