package httpx

import (
	"encoding/json"
	"net/http"
)

// errorBody é o corpo de erro do serviço. Só descreve a causa em termos de
// formato e limite — nome de arquivo, trecho de conteúdo e caminho interno
// nunca entram aqui.
type errorBody struct {
	Error string `json:"error"`
}

// Error responde com um erro legível em JSON.
func Error(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorBody{Error: message})
}

// JSON responde com um corpo serializado.
func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
