// Package bomb protege contra bombas de descompressão.
//
// Mesma política do navegador: teto absoluto de saída sempre, e razão de
// expansão apenas depois de um piso. Razão alta sozinha não é sinal de bomba —
// dado honesto e repetitivo passa fácil de 300× —, o que caracteriza uma bomba
// é razão alta com saída grande.
package bomb

import (
	"errors"
	"fmt"
	"io"
)

// ErrBomb indica que a extração passou dos limites e foi interrompida.
var ErrBomb = errors.New("bomba de descompressão")

// Limits define os tetos.
type Limits struct {
	// MaxOutput é o teto absoluto de bytes extraídos.
	MaxOutput int64
	// MaxRatio é a razão máxima entre saída e entrada.
	MaxRatio float64
	// RatioFloor é a saída a partir da qual a razão passa a valer.
	RatioFloor int64
}

// DefaultLimits espelha os padrões do cliente.
func DefaultLimits() Limits {
	return Limits{
		MaxOutput:  2 << 30,
		MaxRatio:   500,
		RatioFloor: 32 << 20,
	}
}

// Guard acompanha o total extraído e aborta ao ultrapassar um teto.
type Guard struct {
	limits     Limits
	compressed int64
	total      int64
}

// New cria um guarda para uma entrada de tamanho conhecido.
func New(compressedSize int64, limits Limits) *Guard {
	return &Guard{limits: limits, compressed: compressedSize}
}

// Add contabiliza bytes extraídos.
func (g *Guard) Add(n int64) error {
	g.total += n

	if g.total > g.limits.MaxOutput {
		return fmt.Errorf("%w: a extração passou de %d bytes de saída", ErrBomb, g.limits.MaxOutput)
	}

	if g.total > g.limits.RatioFloor && g.compressed > 0 &&
		float64(g.total)/float64(g.compressed) > g.limits.MaxRatio {
		return fmt.Errorf(
			"%w: expansão de %.0f× acima do limite de %.0f×",
			ErrBomb, float64(g.total)/float64(g.compressed), g.limits.MaxRatio,
		)
	}

	return nil
}

// Total é quanto já foi extraído.
func (g *Guard) Total() int64 { return g.total }

// CheckDeclared recusa, antes de alocar memória, um tamanho declarado absurdo —
// formatos com índice informam o tamanho extraído de cada entrada.
func (g *Guard) CheckDeclared(declared int64) error {
	if declared > g.limits.MaxOutput {
		return fmt.Errorf("%w: o arquivo declara %d bytes extraídos", ErrBomb, declared)
	}
	if declared > g.limits.RatioFloor && g.compressed > 0 &&
		float64(declared)/float64(g.compressed) > g.limits.MaxRatio {
		return fmt.Errorf(
			"%w: o arquivo declara expansão de %.0f×",
			ErrBomb, float64(declared)/float64(g.compressed),
		)
	}
	return nil
}

// Writer embrulha um io.Writer contabilizando o que passa por ele. É assim que
// o guarda interrompe uma bomba *durante* a extração, e não depois de a
// memória já ter sido consumida.
func (g *Guard) Writer(w io.Writer) io.Writer {
	return &guardedWriter{guard: g, inner: w}
}

type guardedWriter struct {
	guard *Guard
	inner io.Writer
}

func (w *guardedWriter) Write(p []byte) (int, error) {
	if err := w.guard.Add(int64(len(p))); err != nil {
		return 0, err
	}
	return w.inner.Write(p)
}
