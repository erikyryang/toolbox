// Command toolbox-server é o backend de compactação do toolbox.
//
// Ele existe só para o que o navegador não dá conta: arquivos acima do limite
// client-side, leitura de RAR e 7Z, compressão em XZ e BZIP2 (que não têm
// compressor no navegador) e ZSTD em níveis altos.
//
// Não há camada de armazenamento no binário — nenhum client de banco, cache ou
// fila entra no módulo. O que não existe não pode ser usado por engano.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/erikyryan/toolbox/server/internal/bomb"
	"github.com/erikyryan/toolbox/server/internal/httpx"
	"github.com/erikyryan/toolbox/server/internal/logging"
	"github.com/erikyryan/toolbox/server/internal/spool"
)

type config struct {
	Addr             string
	RequestMaxBytes  int64
	MemoryMaxBytes   int64
	SpoolDir         string
	RequestTimeout   time.Duration
	Concurrency      int
	SemaphoreWait    time.Duration
	RatePerMinute    int
	RateBurst        int
	ReadHeaderTimout time.Duration
	AllowedOrigins   []string
}

func load() config {
	return config{
		Addr:             env("ADDR", ":8080"),
		RequestMaxBytes:  envBytes("REQUEST_MAX_BYTES", 512<<20),
		MemoryMaxBytes:   envBytes("MEM_BUFFER_MAX", 64<<20),
		SpoolDir:         env("SPOOL_DIR", defaultSpoolDir()),
		RequestTimeout:   envDuration("REQUEST_TIMEOUT", 120*time.Second),
		Concurrency:      int(envBytes("MAX_CONCURRENCY", int64(max(2, runtime.NumCPU())))),
		SemaphoreWait:    envDuration("SEMAPHORE_WAIT", 5*time.Second),
		RatePerMinute:    int(envBytes("RATE_PER_MINUTE", 30)),
		RateBurst:        int(envBytes("RATE_BURST", 10)),
		ReadHeaderTimout: envDuration("READ_HEADER_TIMEOUT", 10*time.Second),
		AllowedOrigins:   envList("ALLOWED_ORIGINS"),
	}
}

// defaultSpoolDir mantém o desenvolvimento local utilizável sem exigir que a
// pessoa crie /spool. Em produção, o Compose informa explicitamente /spool,
// que é uma tmpfs montada pelo container.
func defaultSpoolDir() string {
	return filepath.Join(os.TempDir(), "toolbox-spool")
}

// ensureSpoolDir falha cedo quando a área de staging não existe ou não aceita
// escrita. Assim uma configuração inválida não vira um 503 inesperado depois
// que o cliente já enviou um arquivo.
func ensureSpoolDir(dir string) error {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}

	probe, err := os.CreateTemp(dir, ".toolbox-probe-*")
	if err != nil {
		return err
	}
	name := probe.Name()
	if err := probe.Close(); err != nil {
		return err
	}
	return os.Remove(name)
}

// health faz uma requisição ao próprio serviço. Existe porque a imagem é
// scratch: não há shell nem curl para o healthcheck do container usar.
func health(addr string) int {
	if addr[0] == ':' {
		addr = "127.0.0.1" + addr
	}
	client := &http.Client{Timeout: 3 * time.Second}
	response, err := client.Get("http://" + addr + "/healthz")
	if err != nil {
		return 1
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func main() {
	cfg := load()

	if len(os.Args) > 1 && os.Args[1] == "-health" {
		os.Exit(health(cfg.Addr))
	}
	if err := ensureSpoolDir(cfg.SpoolDir); err != nil {
		fmt.Fprintf(os.Stderr, "toolbox-server: área temporária indisponível (%s): %v\n", cfg.SpoolDir, err)
		os.Exit(1)
	}

	log := logging.New()

	service := &httpx.Service{
		Log: log,
		SpoolLimits: spool.Limits{
			MemoryMax:  cfg.MemoryMaxBytes,
			RequestMax: cfg.RequestMaxBytes,
			SpoolDir:   cfg.SpoolDir,
		},
		BombLimits: bomb.DefaultLimits(),
	}

	limiter := httpx.NewRateLimiter(cfg.RatePerMinute, cfg.RateBurst)

	// A ordem importa: recuperação por fora de tudo, cabeçalhos de no-store
	// aplicados a toda resposta (inclusive as de erro), e o semáforo por
	// último, para que uma requisição já recusada por tamanho ou taxa não
	// ocupe um slot de trabalho.
	handler := httpx.Chain(
		service.Routes(),
		httpx.Recover,
		httpx.NoStore,
		httpx.CORS(cfg.AllowedOrigins),
		limiter.Middleware,
		httpx.MaxBytes(cfg.RequestMaxBytes),
		httpx.Timeout(cfg.RequestTimeout),
		httpx.Semaphore(cfg.Concurrency, cfg.SemaphoreWait),
	)

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimout,
		// Sem WriteTimeout: uma compactação legítima de arquivo grande demora,
		// e quem limita o tempo total é o middleware de timeout, que cancela o
		// contexto em vez de cortar a conexão no meio.
	}

	log.Startup(cfg.Addr, cfg.RequestMaxBytes, cfg.MemoryMaxBytes, cfg.Concurrency)

	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// envList lê uma lista separada por vírgulas.
func envList(key string) []string {
	value := os.Getenv(key)
	if value == "" {
		return nil
	}
	return strings.Split(value, ",")
}

func envBytes(key string, fallback int64) int64 {
	value, err := strconv.ParseInt(os.Getenv(key), 10, 64)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(os.Getenv(key))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
