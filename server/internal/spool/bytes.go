package spool

import "bytes"

// newBytesReader devolve um leitor que serve tanto para leitura sequencial
// quanto para acesso aleatório, que é o que a camada A precisa oferecer.
func newBytesReader(data []byte) *bytes.Reader {
	return bytes.NewReader(data)
}
