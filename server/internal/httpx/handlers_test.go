package httpx

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"syscall"
	"testing"
	"time"

	"github.com/erikyryan/toolbox/server/internal/logging"
)

func TestFailFromErrorReportsFullSpoolAsTemporarilyUnavailable(t *testing.T) {
	service := &Service{Log: logging.New()}
	recorder := httptest.NewRecorder()

	service.failFromError(recorder, &logging.Event{}, time.Now(), fmt.Errorf("write staging: %w", syscall.ENOSPC))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	if got := recorder.Header().Get("Retry-After"); got != "5" {
		t.Fatalf("Retry-After = %q, want %q", got, "5")
	}
}
