package spool

import (
	"bytes"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func limits(t *testing.T, memoryMax, requestMax int64) (Limits, string) {
	t.Helper()
	dir := t.TempDir()
	return Limits{MemoryMax: memoryMax, RequestMax: requestMax, SpoolDir: dir}, dir
}

func TestPequenoFicaEmMemoria(t *testing.T) {
	lim, dir := limits(t, 1024, 1<<20)
	content := []byte("conteúdo pequeno")

	buffered, err := Open(bytes.NewReader(content), lim)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer buffered.Close()

	if !buffered.InMemory() {
		t.Error("conteúdo abaixo do teto deveria ficar na camada A")
	}
	if buffered.Size() != int64(len(content)) {
		t.Errorf("Size = %d, esperado %d", buffered.Size(), len(content))
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("a camada A não deve tocar o filesystem; achei %d arquivo(s)", len(entries))
	}
}

func TestGrandeVaiParaTmpfsSemNome(t *testing.T) {
	lim, dir := limits(t, 64, 1<<20)
	content := bytes.Repeat([]byte("x"), 4096)

	buffered, err := Open(bytes.NewReader(content), lim)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer buffered.Close()

	if buffered.InMemory() {
		t.Error("conteúdo acima do teto deveria ir para a camada B")
	}
	if buffered.Size() != int64(len(content)) {
		t.Errorf("Size = %d, esperado %d", buffered.Size(), len(content))
	}

	// O ponto central da política: o arquivo já nasce sem nome no diretório.
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "toolbox-") {
			t.Errorf("arquivo temporário visível por caminho: %s", filepath.Join(dir, entry.Name()))
		}
	}
	if len(entries) != 0 {
		t.Errorf("nenhum nome deveria restar no diretório; achei %d", len(entries))
	}
}

func TestConteudoIntegroNasDuasCamadas(t *testing.T) {
	content := bytes.Repeat([]byte("toolbox "), 1000)

	for _, tc := range []struct {
		name      string
		memoryMax int64
	}{
		{"camada A", 1 << 20},
		{"camada B", 16},
	} {
		t.Run(tc.name, func(t *testing.T) {
			lim, _ := limits(t, tc.memoryMax, 1<<20)
			buffered, err := Open(bytes.NewReader(content), lim)
			if err != nil {
				t.Fatalf("Open: %v", err)
			}
			defer buffered.Close()

			reader, err := buffered.Reader()
			if err != nil {
				t.Fatalf("Reader: %v", err)
			}
			got, err := io.ReadAll(reader)
			if err != nil {
				t.Fatalf("ReadAll: %v", err)
			}
			if !bytes.Equal(got, content) {
				t.Error("conteúdo lido difere do escrito")
			}

			// O acesso aleatório é o que ZIP, RAR e 7Z exigem.
			tail := make([]byte, 8)
			if _, err := buffered.ReaderAt().ReadAt(tail, int64(len(content))-8); err != nil {
				t.Fatalf("ReadAt: %v", err)
			}
			if !bytes.Equal(tail, content[len(content)-8:]) {
				t.Error("ReadAt no fim devolveu bytes errados")
			}
		})
	}
}

func TestAcimaDoTetoAbsolutoERecusado(t *testing.T) {
	lim, _ := limits(t, 16, 128)

	_, err := Open(bytes.NewReader(bytes.Repeat([]byte("x"), 1024)), lim)
	if !errors.Is(err, ErrTooLarge) {
		t.Errorf("erro = %v, esperado ErrTooLarge", err)
	}
}

func TestCloseLiberaODescritor(t *testing.T) {
	lim, _ := limits(t, 16, 1<<20)
	buffered, err := Open(bytes.NewReader(bytes.Repeat([]byte("x"), 4096)), lim)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}

	if err := buffered.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	// Fechar duas vezes não deve explodir: o cleanup dos handlers é por defer
	// e pode coincidir com um fechamento explícito.
	if err := buffered.Close(); err != nil {
		t.Errorf("segundo Close: %v", err)
	}
}

func TestExatamenteNoTetoFicaEmMemoria(t *testing.T) {
	lim, _ := limits(t, 128, 1<<20)

	buffered, err := Open(bytes.NewReader(bytes.Repeat([]byte("x"), 128)), lim)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer buffered.Close()

	if !buffered.InMemory() {
		t.Error("o tamanho exato do teto ainda pertence à camada A")
	}
}
