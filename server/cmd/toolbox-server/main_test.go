package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultSpoolDirUsesSystemTemporaryDirectory(t *testing.T) {
	want := filepath.Join(os.TempDir(), "toolbox-spool")
	if got := defaultSpoolDir(); got != want {
		t.Fatalf("defaultSpoolDir() = %q, want %q", got, want)
	}
}

func TestEnsureSpoolDirCreatesAndChecksDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "spool")
	if err := ensureSpoolDir(dir); err != nil {
		t.Fatalf("ensureSpoolDir() error = %v", err)
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("Stat() error = %v", err)
	}
	if !info.IsDir() {
		t.Fatal("ensureSpoolDir() did not create a directory")
	}
}
