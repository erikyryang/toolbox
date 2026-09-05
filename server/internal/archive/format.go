package archive

import (
	"errors"
	"fmt"
)

// ErrUnsupported indica formato que o serviço não trata.
var ErrUnsupported = errors.New("formato não suportado")

// ErrEncrypted indica arquivo protegido por senha.
var ErrEncrypted = errors.New("arquivo criptografado")

// Format identifica um formato de compactação.
type Format string

const (
	Zip    Format = "zip"
	Gzip   Format = "gzip"
	Zstd   Format = "zstd"
	Xz     Format = "xz"
	Bzip2  Format = "bzip2"
	Tar    Format = "tar"
	TarGz  Format = "tar.gz"
	TarZst Format = "tar.zst"
	Rar    Format = "rar"
	SevenZ Format = "7z"
)

// Spec descreve as capacidades de um formato no serviço.
type Spec struct {
	Format Format
	// Sequential indica que o formato pode ser lido e escrito em streaming,
	// sem materializar a entrada.
	Sequential bool
	// Container indica que o formato tem várias entradas.
	Container bool
	// CanCompress indica se o serviço sabe criar este formato.
	CanCompress bool
	// MinLevel e MaxLevel delimitam o nível aceito.
	MinLevel int
	MaxLevel int
	// Extension é usada no nome do arquivo devolvido.
	Extension string
	// MediaType é o Content-Type da resposta.
	MediaType string
}

var specs = map[Format]Spec{
	Zip:    {Zip, false, true, true, 0, 9, ".zip", "application/zip"},
	Gzip:   {Gzip, true, false, true, 1, 9, ".gz", "application/gzip"},
	Zstd:   {Zstd, true, false, true, 1, 22, ".zst", "application/zstd"},
	Xz:     {Xz, true, false, true, 0, 9, ".xz", "application/x-xz"},
	Bzip2:  {Bzip2, true, false, true, 1, 9, ".bz2", "application/x-bzip2"},
	Tar:    {Tar, true, true, true, 0, 0, ".tar", "application/x-tar"},
	TarGz:  {TarGz, true, true, true, 1, 9, ".tar.gz", "application/gzip"},
	TarZst: {TarZst, true, true, true, 1, 22, ".tar.zst", "application/zstd"},
	// RAR e 7Z: leitura apenas. Não há encoder livre viável para nenhum dos
	// dois, e inventar um não é escopo deste serviço.
	Rar:    {Rar, false, true, false, 0, 0, ".rar", "application/vnd.rar"},
	SevenZ: {SevenZ, false, true, false, 0, 0, ".7z", "application/x-7z-compressed"},
}

// Lookup devolve a especificação de um formato.
func Lookup(format Format) (Spec, error) {
	spec, ok := specs[format]
	if !ok {
		return Spec{}, fmt.Errorf("%w: %s", ErrUnsupported, format)
	}
	return spec, nil
}

// ClampLevel traz o nível para dentro do range do formato.
func ClampLevel(spec Spec, level int) int {
	if spec.MaxLevel == 0 {
		return 0
	}
	if level < spec.MinLevel {
		return spec.MinLevel
	}
	if level > spec.MaxLevel {
		return spec.MaxLevel
	}
	return level
}

// Preset é o nível pedido em linguagem de produto.
type Preset string

const (
	Fast     Preset = "fast"
	Balanced Preset = "balanced"
	Max      Preset = "max"
	Custom   Preset = "custom"
)

// presetLevels espelha o mapa do cliente: o mesmo preset precisa dar o mesmo
// nível dos dois lados, ou o resultado mudaria conforme onde a operação rodou.
var presetLevels = map[Format]map[Preset]int{
	Zip:    {Fast: 1, Balanced: 6, Max: 9},
	Gzip:   {Fast: 1, Balanced: 6, Max: 9},
	Zstd:   {Fast: 1, Balanced: 3, Max: 19},
	Xz:     {Fast: 0, Balanced: 6, Max: 9},
	Bzip2:  {Fast: 1, Balanced: 5, Max: 9},
	Tar:    {Fast: 0, Balanced: 0, Max: 0},
	TarGz:  {Fast: 1, Balanced: 6, Max: 9},
	TarZst: {Fast: 1, Balanced: 3, Max: 19},
}

// LevelFor resolve preset e nível customizado num nível efetivo.
func LevelFor(spec Spec, preset Preset, custom int) int {
	if preset == Custom {
		return ClampLevel(spec, custom)
	}
	levels, ok := presetLevels[spec.Format]
	if !ok {
		return 0
	}
	level, ok := levels[preset]
	if !ok {
		return ClampLevel(spec, levels[Balanced])
	}
	return ClampLevel(spec, level)
}

// Detect identifica o formato pela assinatura dos bytes iniciais.
func Detect(head []byte) (Format, bool) {
	switch {
	case hasPrefix(head, []byte{0x50, 0x4b, 0x03, 0x04}), hasPrefix(head, []byte{0x50, 0x4b, 0x05, 0x06}):
		return Zip, true
	case hasPrefix(head, []byte{0x52, 0x61, 0x72, 0x21, 0x1a, 0x07}):
		return Rar, true
	case hasPrefix(head, []byte{0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c}):
		return SevenZ, true
	case hasPrefix(head, []byte{0x1f, 0x8b}):
		return Gzip, true
	case hasPrefix(head, []byte{0x28, 0xb5, 0x2f, 0xfd}):
		return Zstd, true
	case hasPrefix(head, []byte{0xfd, '7', 'z', 'X', 'Z', 0x00}):
		return Xz, true
	case hasPrefix(head, []byte{'B', 'Z', 'h'}):
		return Bzip2, true
	case len(head) >= 262 && string(head[257:262]) == "ustar":
		return Tar, true
	}
	return "", false
}

func hasPrefix(data, prefix []byte) bool {
	if len(data) < len(prefix) {
		return false
	}
	for i, b := range prefix {
		if data[i] != b {
			return false
		}
	}
	return true
}
