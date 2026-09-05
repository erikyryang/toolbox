package httpx

import (
	"net/http"
	"strings"
)

// CORS libera o frontend, que roda em outra origem.
//
// A lista de origens é explícita: um utilitário que recebe conteúdo sensível
// não deve aceitar requisição de qualquer página. Sem origens configuradas, o
// middleware não emite cabeçalho nenhum e só requisições de mesma origem
// passam — o padrão fechado é o certo aqui.
func CORS(origins []string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(origins))
	for _, origin := range origins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			allowed[trimmed] = true
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			if origin != "" && (allowed[origin] || allowed["*"]) {
				header := w.Header()
				header.Set("Access-Control-Allow-Origin", origin)
				header.Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
				header.Set("Access-Control-Allow-Headers", "Content-Type")
				header.Set("Access-Control-Max-Age", "600")
				// A resposta varia por origem; sem isto, um cache
				// intermediário poderia servir a origem errada.
				header.Add("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
