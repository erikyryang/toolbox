package logging

import (
	"reflect"
	"testing"
)

// permitidos é a lista fechada de metadados que podem ser registrados.
var permitidos = map[string]bool{
	"Operation":  true,
	"Format":     true,
	"BytesIn":    true,
	"BytesOut":   true,
	"Level":      true,
	"DurationMS": true,
	"Status":     true,
	"Outcome":    true,
}

// TestEventoNaoTemCampoParaConteudo é o teste que sustenta a política de logs:
// a garantia não é de disciplina, é de forma. Um campo novo capaz de carregar
// nome de arquivo ou conteúdo quebra este teste antes de chegar à produção.
func TestEventoNaoTemCampoParaConteudo(t *testing.T) {
	tipo := reflect.TypeOf(Event{})

	for i := 0; i < tipo.NumField(); i++ {
		campo := tipo.Field(i)
		if !permitidos[campo.Name] {
			t.Errorf("campo não previsto em Event: %s (%s) — logs só carregam metadados",
				campo.Name, campo.Type)
		}
	}
}

func TestTodoCampoPermitidoExiste(t *testing.T) {
	tipo := reflect.TypeOf(Event{})
	for nome := range permitidos {
		if _, ok := tipo.FieldByName(nome); !ok {
			t.Errorf("campo esperado sumiu de Event: %s", nome)
		}
	}
}
