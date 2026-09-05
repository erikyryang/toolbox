package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func corsHandler(origins []string) http.Handler {
	return CORS(origins)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
}

func TestOrigemPermitidaRecebeCabecalho(t *testing.T) {
	handler := corsHandler([]string{"https://toolbox.example"})

	request := httptest.NewRequest(http.MethodPost, "/", nil)
	request.Header.Set("Origin", "https://toolbox.example")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "https://toolbox.example" {
		t.Errorf("Allow-Origin = %q", got)
	}
	if recorder.Header().Get("Vary") != "Origin" {
		t.Error("faltou Vary: Origin")
	}
}

func TestOrigemDesconhecidaNaoRecebeCabecalho(t *testing.T) {
	handler := corsHandler([]string{"https://toolbox.example"})

	request := httptest.NewRequest(http.MethodPost, "/", nil)
	request.Header.Set("Origin", "https://outra.example")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("origem não configurada não deveria ser liberada")
	}
}

func TestSemConfiguracaoNadaEliberado(t *testing.T) {
	handler := corsHandler(nil)

	request := httptest.NewRequest(http.MethodPost, "/", nil)
	request.Header.Set("Origin", "https://toolbox.example")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Error("o padrão deve ser fechado")
	}
}

func TestPreflightRespondeSemCorpo(t *testing.T) {
	handler := corsHandler([]string{"https://toolbox.example"})

	request := httptest.NewRequest(http.MethodOptions, "/v1/compress", nil)
	request.Header.Set("Origin", "https://toolbox.example")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Errorf("status = %d, esperado 204", recorder.Code)
	}
	if recorder.Header().Get("Access-Control-Allow-Methods") == "" {
		t.Error("faltou Allow-Methods no preflight")
	}
}
