package archive

import (
	"io"

	"github.com/klauspost/compress/flate"
)

// newFlateWriter cria o compressor DEFLATE usado dentro do ZIP, no nível
// pedido — é o que faz o controle de nível chegar ao conteúdo das entradas.
func newFlateWriter(w io.Writer, level int) (io.WriteCloser, error) {
	return flate.NewWriter(w, level)
}
