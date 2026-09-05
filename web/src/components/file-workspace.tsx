"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";

import { AdvancedOptions } from "@/components/advanced-options";
import { PrivacyNote } from "@/components/privacy-note";
import { Button } from "@/components/ui/button";
import {
  backendAvailable,
  compressOnServer,
  extractOnServer,
  inspectOnServer,
} from "@/lib/compression/backend";
import { CompressionClient } from "@/lib/compression/client";
import type { Archive } from "@/lib/compression/codecs";
import {
  FORMATS,
  PRESET_LABELS,
  clampLevel,
  levelForPreset,
  type FormatId,
  type Preset,
} from "@/lib/compression/formats";
import { detectFormat } from "@/lib/compression/detect";
import { CLIENT_MAX_BYTES, decideRouting, formatBytes, type RoutingDecision } from "@/lib/compression/limits";
import type { OperationMeta, OptionValue, OptionValues } from "@/lib/operations/types";
import { defaultOptionValues } from "@/lib/operations/types";

type Mode = "compress" | "decompress";

type Selected = { name: string; size: number; data: ArrayBuffer };

/**
 * A tela das operações de arquivo.
 *
 * O processamento acontece no worker; esta camada cuida da seleção, das
 * opções, da listagem de entradas e — o ponto que mais importa — de mostrar
 * onde a operação vai rodar *antes* de qualquer envio.
 */
export function FileWorkspace({
  operation,
  mode,
  format,
}: {
  operation: OperationMeta;
  mode: Mode;
  format?: FormatId;
}) {
  const [options, setOptions] = useState<OptionValues>(() => defaultOptionValues(operation));
  const [files, setFiles] = useState<Selected[]>([]);
  const [archive, setArchive] = useState<Archive | undefined>();
  const [detectedFormat, setDetectedFormat] = useState<FormatId | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array } | undefined>();

  const inputId = useId();
  const errorId = useId();
  const clientRef = useRef<CompressionClient | undefined>(undefined);

  function client(): CompressionClient {
    clientRef.current ??= new CompressionClient();
    return clientRef.current;
  }

  // Sair da tela leva embora o worker, o módulo WASM e os buffers.
  useEffect(() => {
    return () => clientRef.current?.terminate();
  }, []);

  const preset = (typeof options.preset === "string" ? options.preset : "balanced") as Preset;
  const customLevel = Number(options.level ?? 6);
  const activeFormat: FormatId = format ?? detectedFormat ?? archive?.format ?? "zip";
  const level = format ? levelForPreset(format, preset, customLevel) : 0;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const routing: RoutingDecision = decideRouting({
    format: activeFormat,
    direction: mode === "compress" ? "compress" : "decompress",
    sizeBytes: totalSize,
    level,
  });

  const setOption = useCallback((id: string, value: OptionValue) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, []);

  function reset() {
    clientRef.current?.terminate();
    clientRef.current = undefined;
    setFiles([]);
    setArchive(undefined);
    setDetectedFormat(undefined);
    setResult(undefined);
    setError(undefined);
    setBusy(false);
  }

  async function onSelect(list: FileList | null) {
    if (!list || list.length === 0) return;

    setError(undefined);
    setResult(undefined);
    setArchive(undefined);

    const selected: Selected[] = [];
    for (const file of Array.from(list)) {
      selected.push({ name: file.name, size: file.size, data: await file.arrayBuffer() });
    }
    const detected = mode === "decompress"
      ? detectFormat(new Uint8Array(selected[0].data))
      : undefined;
    setDetectedFormat(detected);
    setFiles(selected);

    if (mode === "decompress") {
      await inspectFile(selected[0], detected);
    }
  }

  async function inspectFile(file: Selected, formatFromSignature?: FormatId) {
    const decision = decideRouting({
      format: formatFromSignature ?? "zip",
      direction: "decompress",
      sizeBytes: file.size,
    });
    if (decision.where === "server" && !backendAvailable()) {
      setError(backendUnavailable(decision));
      return;
    }

    setBusy(true);
    try {
      setArchive(
        decision.where === "server"
          ? await inspectOnServer(file.data)
          : await client().inspect(file.data, file.name),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha ao ler o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function runCompress() {
    if (!format || files.length === 0) return;

    if (routing.where === "server" && !backendAvailable()) {
      setError(backendUnavailable(routing));
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      const payload = files.map((file) => ({ name: file.name, data: file.data }));
      const bytes =
        routing.where === "server"
          ? await compressOnServer(format, preset, level, payload)
          : await client().compress(format, level, payload);
      const base = files.length === 1 ? files[0].name : "arquivos";
      setResult({ name: `${base}${FORMATS[format].extension}`, bytes });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha ao compactar.");
    } finally {
      setBusy(false);
    }
  }

  async function extractEntry(entryName?: string) {
    if (!archive || files.length === 0) return;

    setBusy(true);
    setError(undefined);
    try {
      const decision = decideRouting({
        format: archive.format,
        direction: "decompress",
        sizeBytes: files[0].size,
      });
      const bytes =
        decision.where === "server"
          ? await extractOnServer(files[0].data, entryName)
          : await client().extract(files[0].data, archive, entryName);
      setResult({ name: entryName?.split("/").pop() ?? archive.entries[0].name, bytes });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Falha ao extrair.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.bytes as BlobPart], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const compressDisabled =
    files.length === 0 || busy || (routing.where === "server" && !backendAvailable());

  return (
    <main className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {operation.title}
        </h1>
        <p className="max-w-2xl text-sm text-text-muted">{operation.subtitle}</p>
      </header>

      <div className="mt-10 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-interactive bg-surface-raised px-4 py-10 text-center transition-colors hover:border-accent hover:bg-surface"
          >
            <Upload aria-hidden className="size-5 text-text-muted" />
            <span className="text-sm text-text">
              {mode === "compress"
                ? "Escolha os arquivos para compactar"
                : "Escolha o arquivo para descompactar"}
            </span>
            <span className="text-xs text-text-muted">
              {mode === "compress" && format && FORMATS[format].container
                ? "Vários arquivos podem ser selecionados de uma vez."
                : "Um arquivo por vez."}
            </span>
            {mode === "decompress" ? (
              <span className="max-w-lg text-xs text-text-muted">
                ZIP, GZIP, TAR e XZ rodam localmente até {formatBytes(CLIENT_MAX_BYTES)}. ZSTD, BZIP2, RAR e 7Z usam o servidor.
              </span>
            ) : null}
          </label>

          <input
            id={inputId}
            type="file"
            multiple={mode === "compress" && !!format && FORMATS[format].container}
            onChange={(event) => onSelect(event.target.files)}
            className="sr-only"
            aria-describedby={error ? errorId : undefined}
          />

          {files.length > 0 ? (
            <ul className="flex flex-col gap-1 font-mono text-sm">
              {files.map((file) => (
                <li key={file.name} className="flex justify-between gap-4 text-text">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-text-muted">{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        {files.length > 0 && mode === "compress" ? (
          <section className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onClick={runCompress} disabled={compressDisabled}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              <span>Compactar em {format ? FORMATS[format].label : ""}</span>
            </Button>

            {format && FORMATS[format].levels ? (
              <p className="text-xs text-text-muted">
                {PRESET_LABELS[preset]} — nível {level} de {FORMATS[format].levels.min}–
                {FORMATS[format].levels.max}
              </p>
            ) : null}

            {busy ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X aria-hidden />
                <span>Cancelar</span>
              </Button>
            ) : null}
          </section>
        ) : null}

        {archive ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">
              Conteúdo ({FORMATS[archive.format].label})
            </h2>

            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {archive.entries.map((entry) => (
                <li
                  key={entry.name}
                  className="flex flex-wrap items-center justify-between gap-3 bg-surface px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-text">
                    {entry.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {formatBytes(entry.size)}
                    {entry.compressedSize !== undefined
                      ? ` · comprimido ${formatBytes(entry.compressedSize)}`
                      : ""}
                  </span>
                  {entry.directory ? (
                    <span className="text-xs text-text-muted">pasta</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extractEntry(archive.single ? undefined : entry.name)}
                      disabled={busy}
                    >
                      Extrair
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {result ? (
          <section className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button variant="primary" size="md" onClick={download}>
              <Download aria-hidden />
              <span>Baixar {result.name}</span>
            </Button>
            <p className="font-mono text-xs text-text-muted">
              {formatBytes(result.bytes.length)}
              {mode === "compress" && totalSize > 0
                ? ` · ${Math.round((result.bytes.length / totalSize) * 100)}% do original`
                : ""}
            </p>
          </section>
        ) : null}

        <AdvancedOptions options={operation.options} values={options} onChange={setOption} />

        <footer className="mt-2 border-t border-border pt-4">
          <PrivacyNote
            processedOn={routing.where === "server" ? "server" : "client"}
            reason={routing.reason}
          />
        </footer>
      </div>
    </main>
  );
}

/**
 * Quando o backend não está configurado nesta instalação, uma operação roteada
 * para ele não tem para onde ir — e dizer isso é melhor do que oferecer um
 * botão que falha.
 */
function backendUnavailable(routing: RoutingDecision): string {
  return `Esta operação precisa do servidor (${routing.reason}), que ainda não está disponível. Enquanto isso, use um arquivo dentro do limite local ou outro formato.`;
}

export { clampLevel };
