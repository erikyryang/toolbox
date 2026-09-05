package bomb

import (
	"errors"
	"testing"
)

func limits() Limits {
	return Limits{MaxOutput: 1 << 20, MaxRatio: 10, RatioFloor: 4096}
}

func TestTetoAbsolutoDeSaida(t *testing.T) {
	guard := New(1<<20, limits())
	if err := guard.Add((1 << 20) + 1); !errors.Is(err, ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb", err)
	}
}

func TestRazaoSoValeAcimaDoPiso(t *testing.T) {
	// 100 bytes que viram 1000: razão 10× acima do limite, mas abaixo do piso.
	guard := New(100, limits())
	if err := guard.Add(2000); err != nil {
		t.Errorf("dado honesto abaixo do piso não deveria ser recusado: %v", err)
	}
}

func TestRazaoAcimaDoPisoEBarrada(t *testing.T) {
	guard := New(100, limits())
	if err := guard.Add(8192); !errors.Is(err, ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb", err)
	}
}

func TestAcumulaEntreBlocos(t *testing.T) {
	guard := New(100, limits())
	var err error
	for i := 0; i < 10; i++ {
		if err = guard.Add(1024); err != nil {
			break
		}
	}
	if !errors.Is(err, ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb depois de acumular", err)
	}
}

func TestTamanhoDeclaradoERecusadoAntesDeAlocar(t *testing.T) {
	guard := New(100, limits())
	if err := guard.CheckDeclared(1 << 20); !errors.Is(err, ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb", err)
	}
	if err := guard.CheckDeclared(500); err != nil {
		t.Errorf("tamanho plausível não deveria ser recusado: %v", err)
	}
}

func TestWriterInterrompeDuranteAEscrita(t *testing.T) {
	guard := New(100, limits())
	writer := guard.Writer(discard{})

	var err error
	for i := 0; i < 10; i++ {
		if _, err = writer.Write(make([]byte, 1024)); err != nil {
			break
		}
	}
	if !errors.Is(err, ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb durante a escrita", err)
	}
}

type discard struct{}

func (discard) Write(p []byte) (int, error) { return len(p), nil }
