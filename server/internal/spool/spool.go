// Package spool materializa o corpo de uma requisição para os formatos que
// não podem ser lidos em streaming.
//
// GZIP, ZSTD, XZ, BZIP2 e TAR são sequenciais: entram por um io.Reader e saem
// por um io.Writer com memória constante. ZIP, RAR e 7Z guardam o índice das
// entradas no fim do arquivo e exigem io.ReaderAt — é preciso voltar atrás, e
// para isso o conteúdo precisa existir em algum lugar.
//
// A política tem três camadas:
//
//	A  até MemoryMax          buffer em memória, nada toca o filesystem
//	B  até RequestMax         arquivo em tmpfs, criado e imediatamente removido
//	C  acima disso            recusado
//
// A camada B usa create-then-unlink: o inode perde o nome no mesmo instante em
// que é criado, o conteúdo vive apenas enquanto o descritor estiver aberto e
// desaparece quando o processo fecha — inclusive sob SIGKILL. Não depende de
// defer, não depende de encerramento limpo, e nunca fica visível por caminho
// para outro processo. A tmpfs é RAM: nada chega a disco.
package spool

import (
	"errors"
	"fmt"
	"io"
	"os"
)

// ErrTooLarge indica corpo acima de RequestMax — vira 413 na camada HTTP.
var ErrTooLarge = errors.New("conteúdo acima do limite por requisição")

// Limits governa as três camadas.
type Limits struct {
	// MemoryMax é o teto da camada A, em bytes.
	MemoryMax int64
	// RequestMax é o teto absoluto do corpo, em bytes.
	RequestMax int64
	// SpoolDir é a tmpfs onde a camada B cria seus arquivos.
	SpoolDir string
}

// Spool guarda o conteúdo em memória ou em tmpfs, conforme o tamanho.
type Spool struct {
	mem  []byte
	file *os.File
	size int64
}

// Open consome r inteiro, escolhendo a camada pelo tamanho observado.
func Open(r io.Reader, limits Limits) (*Spool, error) {
	if limits.MemoryMax <= 0 {
		limits.MemoryMax = 64 << 20
	}
	if limits.RequestMax <= 0 {
		limits.RequestMax = 512 << 20
	}

	// Lê um byte além do teto de memória: é assim que se descobre que a
	// camada A não serve, sem precisar confiar em Content-Length.
	head := make([]byte, limits.MemoryMax+1)
	read, err := io.ReadFull(r, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, err
	}

	if int64(read) <= limits.MemoryMax {
		return &Spool{mem: head[:read], size: int64(read)}, nil
	}

	return spillToDisk(io.MultiReader(newBytesReader(head[:read]), r), limits)
}

func spillToDisk(r io.Reader, limits Limits) (*Spool, error) {
	file, err := os.CreateTemp(limits.SpoolDir, "toolbox-*")
	if err != nil {
		return nil, fmt.Errorf("não foi possível abrir a área temporária: %w", err)
	}

	// O unlink acontece agora, não no fim: a partir daqui o arquivo não tem
	// nome no diretório e só existe enquanto este descritor viver.
	if err := os.Remove(file.Name()); err != nil {
		file.Close()
		return nil, fmt.Errorf("não foi possível desvincular o arquivo temporário: %w", err)
	}

	written, err := io.Copy(file, io.LimitReader(r, limits.RequestMax+1))
	if err != nil {
		file.Close()
		return nil, err
	}

	if written > limits.RequestMax {
		file.Close()
		return nil, ErrTooLarge
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		file.Close()
		return nil, err
	}

	return &Spool{file: file, size: written}, nil
}

// Size é o tamanho do conteúdo em bytes.
func (s *Spool) Size() int64 { return s.size }

// InMemory informa se o conteúdo ficou na camada A.
func (s *Spool) InMemory() bool { return s.file == nil }

// ReaderAt entrega o acesso aleatório que ZIP, RAR e 7Z exigem.
func (s *Spool) ReaderAt() io.ReaderAt {
	if s.file != nil {
		return s.file
	}
	return newBytesReader(s.mem)
}

// Reader entrega leitura sequencial a partir do início.
func (s *Spool) Reader() (io.Reader, error) {
	if s.file == nil {
		return newBytesReader(s.mem), nil
	}
	if _, err := s.file.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	return s.file, nil
}

// Close libera o conteúdo. Para a camada B, fechar o descritor é o que apaga
// de fato os dados: o inode já estava sem nome.
func (s *Spool) Close() error {
	s.mem = nil
	if s.file == nil {
		return nil
	}
	err := s.file.Close()
	s.file = nil
	return err
}
