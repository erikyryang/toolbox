// Package httpx traz as proteções operacionais e as garantias de não-cache.
//
// Tudo aqui é middleware, e de propósito: um handler novo herda as garantias
// sem que ninguém precise lembrar delas. Cabeçalho de no-store esquecido numa
// rota é exatamente o tipo de falha que a arquitetura deve tornar impossível.
package httpx

import (
	"context"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// NoStore aplica os cabeçalhos que impedem qualquer forma de cache do
// conteúdo do usuário — navegador, proxy ou CDN.
func NoStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		header.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		header.Set("Pragma", "no-cache")
		header.Set("Expires", "0")
		// Nada do que trafega aqui deve virar referência para outro destino.
		header.Set("Referrer-Policy", "no-referrer")
		header.Set("X-Content-Type-Options", "nosniff")
		next.ServeHTTP(w, r)
	})
}

// MaxBytes recusa corpos acima do teto antes de ler qualquer coisa.
func MaxBytes(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Content-Length é uma dica: quando ela já denuncia excesso, a
			// resposta sai sem ler um byte do corpo.
			if r.ContentLength > limit {
				Error(w, http.StatusRequestEntityTooLarge, "o arquivo passa do limite por requisição")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

// Timeout dá um prazo à requisição. Os adaptadores de Reader, ReaderAt e
// Writer usados pelos handlers observam este contexto entre blocos, liberando
// o semáforo e os buffers assim que o prazo vence.
func Timeout(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), d)
			defer cancel()
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Semaphore limita quantas operações caras correm ao mesmo tempo.
//
// ZSTD em nível alto aloca centenas de MB por operação: sem esse limite, um
// punhado de requisições simultâneas derruba o processo. Quem não consegue
// entrar dentro do prazo recebe 503 e um Retry-After, em vez de ficar numa
// fila indefinida — enfileirar sem limite só adia a queda.
func Semaphore(slots int, wait time.Duration) func(http.Handler) http.Handler {
	tokens := make(chan struct{}, slots)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			timer := time.NewTimer(wait)
			defer timer.Stop()

			select {
			case tokens <- struct{}{}:
				defer func() { <-tokens }()
				next.ServeHTTP(w, r)
			case <-timer.C:
				w.Header().Set("Retry-After", strconv.Itoa(int(wait.Seconds())+1))
				Error(w, http.StatusServiceUnavailable, "o serviço está ocupado; tente de novo em instantes")
			case <-r.Context().Done():
				Error(w, http.StatusRequestTimeout, "a requisição foi cancelada antes de começar")
			}
		})
	}
}

// RateLimiter é um token bucket por origem.
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	rate     float64
	capacity float64
	ttl      time.Duration
}

type bucket struct {
	tokens float64
	seen   time.Time
}

// NewRateLimiter cria um limitador de `perMinute` requisições por origem, com
// estouro até `burst`.
func NewRateLimiter(perMinute int, burst int) *RateLimiter {
	return &RateLimiter{
		buckets:  make(map[string]*bucket),
		rate:     float64(perMinute) / 60,
		capacity: float64(burst),
		ttl:      10 * time.Minute,
	}
}

// Allow consome um token da origem, se houver.
func (l *RateLimiter) Allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry, ok := l.buckets[key]
	if !ok {
		l.buckets[key] = &bucket{tokens: l.capacity - 1, seen: now}
		l.sweep(now)
		return true
	}

	entry.tokens += now.Sub(entry.seen).Seconds() * l.rate
	if entry.tokens > l.capacity {
		entry.tokens = l.capacity
	}
	entry.seen = now

	if entry.tokens < 1 {
		return false
	}
	entry.tokens--
	return true
}

// sweep descarta buckets antigos; sem isso, o mapa cresceria sem limite.
func (l *RateLimiter) sweep(now time.Time) {
	for key, entry := range l.buckets {
		if now.Sub(entry.seen) > l.ttl {
			delete(l.buckets, key)
		}
	}
}

// Middleware aplica o limite por origem.
func (l *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.Allow(clientIP(r), time.Now()) {
			w.Header().Set("Retry-After", "60")
			Error(w, http.StatusTooManyRequests, "muitas requisições; espere um pouco")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP identifica a origem. X-Forwarded-For é dado controlado pelo cliente
// quando o serviço está exposto diretamente; só um proxy confiável deveria
// resolvê-lo e repassar o IP já validado por um canal próprio. O IP não é
// registrado em log — serve apenas como chave em memória do limitador.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Recover transforma pânico em 500 sem derrubar o processo e sem vazar o
// stack trace na resposta.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				Error(w, http.StatusInternalServerError, "a operação falhou")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// Chain aplica middlewares na ordem em que são declarados.
func Chain(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}
