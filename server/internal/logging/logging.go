// Package logging emite apenas metadados operacionais.
//
// A garantia não vem da disciplina de quem chama, e sim da forma do tipo: o
// evento de log não tem campo capaz de carregar nome de arquivo ou conteúdo.
// O que não existe na struct não vaza no log.
package logging

import (
	"io"
	"log/slog"
	"os"
	"time"
)

// Event é tudo que pode ser registrado sobre uma operação.
type Event struct {
	Operation  string
	Format     string
	BytesIn    int64
	BytesOut   int64
	Level      int
	DurationMS int64
	Status     int
	// Outcome descreve a classe do erro ("formato_invalido", "timeout"), nunca
	// a mensagem crua — mensagens podem carregar trechos da entrada.
	Outcome string
}

// Logger escreve eventos em JSON estruturado.
type Logger struct {
	base *slog.Logger
}

// New cria um logger sobre a saída padrão.
func New() *Logger {
	return NewWithWriter(os.Stdout)
}

// NewWithWriter cria um logger sobre um destino qualquer. Existe para que o
// teste possa ler o que foi realmente emitido.
func NewWithWriter(w io.Writer) *Logger {
	return &Logger{
		base: slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})),
	}
}

// Operation registra o desfecho de uma operação.
func (l *Logger) Operation(event Event) {
	attrs := []any{
		slog.String("operation", event.Operation),
		slog.String("format", event.Format),
		slog.Int64("bytes_in", event.BytesIn),
		slog.Int64("bytes_out", event.BytesOut),
		slog.Int64("duration_ms", event.DurationMS),
		slog.Int("status", event.Status),
	}
	if event.Level > 0 {
		attrs = append(attrs, slog.Int("level", event.Level))
	}
	if event.Outcome != "" {
		attrs = append(attrs, slog.String("outcome", event.Outcome))
	}
	l.base.Info("operation", attrs...)
}

// Startup registra a subida do serviço; não há conteúdo de usuário envolvido.
func (l *Logger) Startup(addr string, requestMax, memoryMax int64, concurrency int) {
	l.base.Info("startup",
		slog.String("addr", addr),
		slog.Int64("request_max_bytes", requestMax),
		slog.Int64("memory_max_bytes", memoryMax),
		slog.Int("concurrency", concurrency),
	)
}

// Since devolve a duração em milissegundos, como o Event espera.
func Since(start time.Time) int64 {
	return time.Since(start).Milliseconds()
}
