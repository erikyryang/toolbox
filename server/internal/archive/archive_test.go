package archive

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/erikyryan/toolbox/server/internal/bomb"
)

const contentA = "conteúdo do arquivo A\n"
const contentB = "outro conteúdo, bem diferente\n"

func sources(t *testing.T) []Source {
	t.Helper()
	return []Source{
		{Name: "a.txt", Size: int64(len(contentA)), Body: strings.NewReader(contentA)},
		{Name: "pasta/b.txt", Size: int64(len(contentB)), Body: strings.NewReader(contentB)},
	}
}

func single(t *testing.T) []Source {
	t.Helper()
	return []Source{{Name: "a.txt", Size: int64(len(contentA)), Body: strings.NewReader(contentA)}}
}

func guard(size int64) *bomb.Guard {
	return bomb.New(size, bomb.DefaultLimits())
}

func TestIdaEVoltaPorFormato(t *testing.T) {
	cases := []struct {
		format    Format
		container bool
	}{
		{Zip, true},
		{Tar, true},
		{TarGz, true},
		{TarZst, true},
		{Gzip, false},
		{Zstd, false},
		{Xz, false},
		{Bzip2, false},
	}

	for _, tc := range cases {
		t.Run(string(tc.format), func(t *testing.T) {
			var packed bytes.Buffer
			input := single(t)
			if tc.container {
				input = sources(t)
			}

			written, err := Compress(&packed, tc.format, 6, input)
			if err != nil {
				t.Fatalf("Compress: %v", err)
			}
			if written != int64(packed.Len()) {
				t.Errorf("bytes contados = %d, escritos = %d", written, packed.Len())
			}

			data := packed.Bytes()
			source := ReaderAtSource{ReaderAt: bytes.NewReader(data), Size: int64(len(data))}

			detected, ok := Detect(data)
			if !ok {
				t.Fatal("formato gerado não foi reconhecido pela própria detecção")
			}

			listing, err := List(source, detected, guard(int64(len(data))))
			if err != nil {
				t.Fatalf("List: %v", err)
			}
			if len(listing.Entries) == 0 {
				t.Fatal("listagem vazia")
			}

			entry := ""
			if !listing.Single && tc.container {
				entry = "a.txt"
			}

			var out bytes.Buffer
			if _, err := Extract(&out, source, detected, entry, guard(int64(len(data)))); err != nil {
				t.Fatalf("Extract: %v", err)
			}
			if out.String() != contentA {
				t.Errorf("conteúdo extraído = %q, esperado %q", out.String(), contentA)
			}
		})
	}
}

func TestZipListaTamanhoOriginalEComprimido(t *testing.T) {
	var packed bytes.Buffer
	repeated := strings.Repeat(contentA, 50)
	input := []Source{{Name: "a.txt", Size: int64(len(repeated)), Body: strings.NewReader(repeated)}}

	if _, err := Compress(&packed, Zip, 9, input); err != nil {
		t.Fatalf("Compress: %v", err)
	}

	data := packed.Bytes()
	listing, err := List(ReaderAtSource{bytes.NewReader(data), int64(len(data))}, Zip, guard(int64(len(data))))
	if err != nil {
		t.Fatalf("List: %v", err)
	}

	entry := listing.Entries[0]
	if entry.Size != int64(len(repeated)) {
		t.Errorf("tamanho original = %d, esperado %d", entry.Size, len(repeated))
	}
	if entry.CompressedSize >= entry.Size {
		t.Errorf("tamanho comprimido (%d) deveria ser menor que o original (%d)",
			entry.CompressedSize, entry.Size)
	}
}

func TestNivelAltoNaoPioraACompressao(t *testing.T) {
	repeated := strings.Repeat(contentA, 200)

	compressAt := func(level int) int {
		var out bytes.Buffer
		input := []Source{{Name: "a.txt", Size: int64(len(repeated)), Body: strings.NewReader(repeated)}}
		if _, err := Compress(&out, Gzip, level, input); err != nil {
			t.Fatalf("Compress nível %d: %v", level, err)
		}
		return out.Len()
	}

	if compressAt(9) > compressAt(1) {
		t.Error("nível 9 gerou saída maior que nível 1")
	}
}

func TestPresetsCaemDentroDoRange(t *testing.T) {
	for _, format := range []Format{Zip, Gzip, Zstd, Xz, Bzip2, TarGz, TarZst} {
		spec, err := Lookup(format)
		if err != nil {
			t.Fatalf("Lookup %s: %v", format, err)
		}
		for _, preset := range []Preset{Fast, Balanced, Max} {
			level := LevelFor(spec, preset, 0)
			if level < spec.MinLevel || level > spec.MaxLevel {
				t.Errorf("%s/%s = %d, fora de [%d, %d]", format, preset, level, spec.MinLevel, spec.MaxLevel)
			}
		}
	}
}

func TestPresetsBatemComOCliente(t *testing.T) {
	// O mesmo preset precisa dar o mesmo nível dos dois lados; se divergirem,
	// o resultado mudaria conforme onde a operação rodou.
	want := map[Format]map[Preset]int{
		Gzip:   {Fast: 1, Balanced: 6, Max: 9},
		Zstd:   {Fast: 1, Balanced: 3, Max: 19},
		Xz:     {Fast: 0, Balanced: 6, Max: 9},
		Bzip2:  {Fast: 1, Balanced: 5, Max: 9},
		Zip:    {Fast: 1, Balanced: 6, Max: 9},
		TarGz:  {Fast: 1, Balanced: 6, Max: 9},
		TarZst: {Fast: 1, Balanced: 3, Max: 19},
	}

	for format, presets := range want {
		spec, _ := Lookup(format)
		for preset, expected := range presets {
			if got := LevelFor(spec, preset, 0); got != expected {
				t.Errorf("%s/%s = %d, esperado %d", format, preset, got, expected)
			}
		}
	}
}

func TestNivelCustomizadoERespeitadoEDelimitado(t *testing.T) {
	spec, _ := Lookup(Zstd)
	if got := LevelFor(spec, Custom, 15); got != 15 {
		t.Errorf("nível customizado = %d, esperado 15", got)
	}
	if got := LevelFor(spec, Custom, 99); got != spec.MaxLevel {
		t.Errorf("nível acima do range = %d, esperado %d", got, spec.MaxLevel)
	}
}

func TestFormatosDeLeituraNaoComprimem(t *testing.T) {
	for _, format := range []Format{Rar, SevenZ} {
		var out bytes.Buffer
		_, err := Compress(&out, format, 6, single(t))
		if !errors.Is(err, ErrUnsupported) {
			t.Errorf("%s: erro = %v, esperado ErrUnsupported", format, err)
		}
	}
}

func TestFormatoDesconhecidoNaDeteccao(t *testing.T) {
	if _, ok := Detect([]byte{1, 2, 3, 4, 5, 6, 7, 8}); ok {
		t.Error("bytes arbitrários não deveriam ser reconhecidos")
	}
}

func TestBombaEInterrompida(t *testing.T) {
	// Um arquivo pequeno que se expande muito além do piso absoluto.
	limits := bomb.Limits{MaxOutput: 1 << 30, MaxRatio: 2, RatioFloor: 1024}
	zeros := strings.Repeat("\x00", 64<<10)

	var packed bytes.Buffer
	input := []Source{{Name: "z.bin", Size: int64(len(zeros)), Body: strings.NewReader(zeros)}}
	if _, err := Compress(&packed, Gzip, 9, input); err != nil {
		t.Fatalf("Compress: %v", err)
	}

	data := packed.Bytes()
	var out bytes.Buffer
	_, err := Extract(&out, ReaderAtSource{bytes.NewReader(data), int64(len(data))}, Gzip, "",
		bomb.New(int64(len(data)), limits))

	if !errors.Is(err, bomb.ErrBomb) {
		t.Errorf("erro = %v, esperado ErrBomb", err)
	}
}

func TestEntradaInexistente(t *testing.T) {
	var packed bytes.Buffer
	if _, err := Compress(&packed, Zip, 6, sources(t)); err != nil {
		t.Fatalf("Compress: %v", err)
	}

	data := packed.Bytes()
	var out bytes.Buffer
	_, err := Extract(&out, ReaderAtSource{bytes.NewReader(data), int64(len(data))}, Zip,
		"nao-existe.txt", guard(int64(len(data))))

	if err == nil {
		t.Fatal("esperava erro para entrada inexistente")
	}
	// A mensagem não deve ecoar o nome enviado: é conteúdo do usuário.
	if strings.Contains(err.Error(), "nao-existe.txt") {
		t.Errorf("a mensagem ecoou o nome da entrada: %q", err.Error())
	}
}

func TestArquivoCorrompidoDaErroDeFormato(t *testing.T) {
	corrupted := append([]byte{0x1f, 0x8b, 0x08}, bytes.Repeat([]byte{0xff}, 64)...)

	var out bytes.Buffer
	_, err := Extract(&out, ReaderAtSource{bytes.NewReader(corrupted), int64(len(corrupted))},
		Gzip, "", guard(int64(len(corrupted))))

	if err == nil {
		t.Fatal("esperava erro para arquivo corrompido")
	}
}

// fixtureDir localiza os arquivos de teste das próprias bibliotecas de leitura,
// no cache de módulos. É a única fonte de 7Z e RAR reais disponível: não existe
// escritor desses formatos em Go, e gerar um arquivo à mão não é viável.
func fixtureDir(t *testing.T, module string) string {
	t.Helper()

	out, err := exec.Command("go", "env", "GOMODCACHE").Output()
	if err != nil {
		t.Skipf("go env indisponível: %v", err)
	}

	dir := filepath.Join(strings.TrimSpace(string(out)), filepath.FromSlash(module), "testdata")
	if _, err := os.Stat(dir); err != nil {
		t.Skipf("fixtures de %s não estão no cache de módulos", module)
	}
	return dir
}

func TestLeituraDe7ZComArquivoReal(t *testing.T) {
	dir := fixtureDir(t, "github.com/bodgit/sevenzip@v1.6.5")

	data, err := os.ReadFile(filepath.Join(dir, "t1.7z"))
	if err != nil {
		t.Skipf("fixture de 7Z ausente: %v", err)
	}

	if format, ok := Detect(data); !ok || format != SevenZ {
		t.Fatalf("detecção do 7Z falhou (formato=%s ok=%v)", format, ok)
	}

	source := ReaderAtSource{bytes.NewReader(data), int64(len(data))}
	listing, err := List(source, SevenZ, guard(int64(len(data))))
	if err != nil {
		t.Fatalf("List 7Z: %v", err)
	}
	if len(listing.Entries) == 0 {
		t.Fatal("listagem de 7Z vazia")
	}

	var extracted bool
	for _, entry := range listing.Entries {
		if entry.Directory {
			continue
		}
		var out bytes.Buffer
		if _, err := Extract(&out, source, SevenZ, entry.Name, guard(int64(len(data)))); err != nil {
			t.Fatalf("Extract 7Z (%s): %v", entry.Name, err)
		}
		if int64(out.Len()) != entry.Size {
			t.Errorf("extraído %d bytes, a listagem declarava %d", out.Len(), entry.Size)
		}
		extracted = true
		break
	}
	if !extracted {
		t.Skip("o fixture de 7Z só tem diretórios")
	}
}

func TestSeteZCriptografadoERecusado(t *testing.T) {
	dir := fixtureDir(t, "github.com/bodgit/sevenzip@v1.6.5")

	data, err := os.ReadFile(filepath.Join(dir, "aes7z.7z"))
	if err != nil {
		t.Skipf("fixture criptografado ausente: %v", err)
	}

	source := ReaderAtSource{bytes.NewReader(data), int64(len(data))}
	var out bytes.Buffer
	_, extractErr := Extract(&out, source, SevenZ, "", guard(int64(len(data))))

	// O que importa é não devolver saída parcial como se fosse o conteúdo.
	if extractErr == nil && out.Len() > 0 {
		t.Error("um 7Z protegido por senha não deveria produzir conteúdo")
	}
}

func TestLeituraDeRarComArquivoReal(t *testing.T) {
	dir := fixtureDir(t, "github.com/nwaples/rardecode/v2@v2.4.1")

	matches, err := filepath.Glob(filepath.Join(dir, "*.rar"))
	if err != nil || len(matches) == 0 {
		t.Skip("nenhum fixture RAR no cache de módulos")
	}

	data, err := os.ReadFile(matches[0])
	if err != nil {
		t.Skipf("fixture de RAR ilegível: %v", err)
	}

	if format, ok := Detect(data); !ok || format != Rar {
		t.Skipf("o fixture %s não é um RAR simples", filepath.Base(matches[0]))
	}

	source := ReaderAtSource{bytes.NewReader(data), int64(len(data))}
	listing, err := List(source, Rar, guard(int64(len(data))))
	if err != nil {
		t.Fatalf("List RAR: %v", err)
	}
	if len(listing.Entries) == 0 {
		t.Fatal("listagem de RAR vazia")
	}
}
