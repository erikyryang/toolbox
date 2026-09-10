"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";

import { AdvancedOptions } from "@/components/advanced-options";
import { PrivacyNote } from "@/components/privacy-note";
import { PythonScriptPanel } from "@/components/python-script";
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
  COMPRESSIBLE_FORMATS,
  FORMATS,
  PRESET_LABELS,
  clampLevel,
  levelForPreset,
  type FormatId,
  type Preset,
} from "@/lib/compression/formats";
import { detectFormat } from "@/lib/compression/detect";
import { TEXT_ENCODING_LABELS, decodeArchiveText, pastedFileName } from "@/lib/compression/from-text";
import { levelOptionsFor } from "@/lib/operations/compression-catalog";
import { CLIENT_MAX_BYTES, decideRouting, formatBytes, type RoutingDecision } from "@/lib/compression/limits";
import type { OperationMeta, OptionValue, OptionValues } from "@/lib/operations/types";
import { defaultOptionValues } from "@/lib/operations/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";

type Mode = "compress" | "decompress";

/** De onde vem o arquivo a descompactar. Compactar sempre parte de arquivos. */
type Source = "file" | "text";

/** Valores padrão das opções de nível de um formato. */
function optionValuesFor(format: FormatId): OptionValues {
  const values: OptionValues = {};
  for (const option of levelOptionsFor(format)) values[option.id] = option.default;
  return values;
}

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
  initialFormat,
}: {
  operation: OperationMeta;
  mode: Mode;
  /** Formato pré-escolhido pela rota de entrada; só semeia o estado. */
  initialFormat?: FormatId;
}) {
  const { language } = useLanguage();
  // Ao compactar, o formato é escolha do usuário e vive aqui. Ao descompactar
  // ele nunca é escolhido: quem decide é a assinatura do arquivo.
  const [format, setFormat] = useState<FormatId>(initialFormat ?? "zip");
  const [options, setOptions] = useState<OptionValues>(() =>
    mode === "compress"
      ? optionValuesFor(initialFormat ?? "zip")
      : defaultOptionValues(operation),
  );
  const [files, setFiles] = useState<Selected[]>([]);
  const [archive, setArchive] = useState<Archive | undefined>();
  const [detectedFormat, setDetectedFormat] = useState<FormatId | undefined>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<Source>("file");
  const [pasted, setPasted] = useState("");
  const [pastedNote, setPastedNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<{ name: string; bytes: Uint8Array } | undefined>();

  const inputId = useId();
  const pasteId = useId();
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
  const compressing = mode === "compress";
  const activeFormat: FormatId = compressing
    ? format
    : detectedFormat ?? archive?.format ?? "zip";
  const level = compressing ? levelForPreset(format, preset, customLevel) : 0;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  // As opções seguem o formato ativo, não a rota: o range de nível do ZSTD
  // (1–22) não é o do GZIP (1–9).
  const levelOptions = compressing ? levelOptionsFor(format) : operation.options;

  const routing: RoutingDecision = decideRouting({
    format: activeFormat,
    direction: mode === "compress" ? "compress" : "decompress",
    sizeBytes: totalSize,
    level,
  });

  const acceptsMany = compressing && FORMATS[format].container;

  /**
   * Trocar de formato preserva o preset — ele quer dizer a mesma coisa em
   * todos —, mas refaz o nível exato, que é medido no range do formato.
   *
   * Se o novo formato guarda um arquivo só e havia vários escolhidos, o
   * excedente é dispensado com aviso: descartar em silêncio seria pior.
   */
  function changeFormat(next: FormatId) {
    if (next === format) return;
    setFormat(next);
    setResult(undefined);
    setOptions((current) => ({ ...optionValuesFor(next), preset: current.preset ?? "balanced" }));

    if (!FORMATS[next].container && files.length > 1) {
      const kept = files[0];
      setFiles([kept]);
      setError(
        language === "pt"
          ? `${FORMATS[next].label} compacta um arquivo por vez — os outros foram dispensados e só "${kept.name}" continua selecionado.`
          : `${FORMATS[next].label} compresses one file at a time — the others were dropped and only "${kept.name}" is still selected.`,
      );
    } else {
      setError(undefined);
    }
  }

  const setOption = useCallback((id: string, value: OptionValue) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, []);

  /**
   * Arrastar e soltar. A área já tinha a aparência de um alvo de arraste —
   * borda tracejada e seta — sem responder a um; o descompasso fazia a
   * ferramenta parecer quebrada para quem tentava o gesto óbvio.
   */
  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    void onSelect(event.dataTransfer.files);
  }

  function reset() {
    clientRef.current?.terminate();
    clientRef.current = undefined;
    setFiles([]);
    setArchive(undefined);
    setDetectedFormat(undefined);
    setResult(undefined);
    setError(undefined);
    setBusy(false);
    setDragging(false);
    setPastedNote(undefined);
  }

  function changeSource(next: Source) {
    if (next === source) return;
    reset();
    setPasted("");
    setSource(next);
  }

  /**
   * Lê o texto colado como um arquivo e segue pelo mesmo caminho da seleção.
   *
   * A partir daqui nada distingue os dois caminhos: a inspeção, a decisão de
   * roteamento e a extração recebem os mesmos bytes que receberiam de um
   * arquivo escolhido no disco.
   */
  async function readPasted() {
    setError(undefined);
    setResult(undefined);
    setArchive(undefined);
    setPastedNote(undefined);

    let decoded;
    try {
      decoded = decodeArchiveText(pasted);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível ler o texto.");
      return;
    }

    const name = pastedFileName(decoded.format, language);
    // A cópia isola os bytes do buffer do worker, que pode ser transferido.
    const selected: Selected = {
      name,
      size: decoded.bytes.length,
      data: decoded.bytes.slice().buffer as ArrayBuffer,
    };

    setPastedNote(
      language === "pt"
        ? `Lido como ${TEXT_ENCODING_LABELS[decoded.encoding]}${decoded.dataUrl ? " dentro de um data: URL" : ""} — ${FORMATS[decoded.format].label}, ${formatBytes(selected.size)}.`
        : `Read as ${TEXT_ENCODING_LABELS[decoded.encoding]}${decoded.dataUrl ? " inside a data: URL" : ""} — ${FORMATS[decoded.format].label}, ${formatBytes(selected.size)}.`,
    );
    setDetectedFormat(decoded.format);
    setFiles([selected]);
    await inspectFile(selected, decoded.format);
  }

  async function onSelect(list: FileList | null) {
    if (!list || list.length === 0) return;

    setError(undefined);
    setResult(undefined);
    setArchive(undefined);

    // O atributo `multiple` do input já limita a escolha pelo seletor, mas o
    // arrastar não passa por ele: aqui a regra vale para os dois caminhos.
    const incoming = acceptsMany ? Array.from(list) : [list[0]];
    const selected: Selected[] = [];
    for (const file of incoming) {
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
      setError(backendUnavailable(decision, language));
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
      setError(failure instanceof Error ? failure.message : language === "pt" ? "Falha ao ler o arquivo." : "Could not read the file.");
    } finally {
      setBusy(false);
    }
  }

  async function runCompress() {
    if (files.length === 0) return;

    if (routing.where === "server" && !backendAvailable()) {
      setError(backendUnavailable(routing, language));
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
      setError(failure instanceof Error ? failure.message : language === "pt" ? "Falha ao compactar." : "Could not compress the files.");
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
      setError(failure instanceof Error ? failure.message : language === "pt" ? "Falha ao extrair." : "Could not extract the file.");
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
        {compressing ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">
              {language === "pt" ? "Formato" : "Format"}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label={language === "pt" ? "Formato de saída" : "Output format"}
                className="inline-flex flex-wrap rounded-lg border border-border-interactive p-0.5"
              >
                {COMPRESSIBLE_FORMATS.map((option) => {
                  const current = option === format;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={current}
                      onClick={() => changeFormat(option)}
                      className={cn(
                        "rounded-md px-3 py-1 text-sm transition-colors",
                        current
                          ? "bg-accent-solid font-medium text-accent-foreground"
                          : "text-text-muted hover:text-text",
                      )}
                    >
                      {FORMATS[option].label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-muted">
                {FORMATS[format].container
                  ? (language === "pt" ? "Guarda vários arquivos." : "Holds several files.")
                  : (language === "pt" ? "Um arquivo por vez." : "One file at a time.")}
                {FORMATS[format].levels
                  ? (language === "pt"
                      ? ` Nível ${FORMATS[format].levels.min}–${FORMATS[format].levels.max}.`
                      : ` Level ${FORMATS[format].levels.min}–${FORMATS[format].levels.max}.`)
                  : (language === "pt" ? " Sem compressão: só junta." : " No compression: it only bundles.")}
              </p>
            </div>
          </section>
        ) : null}

        {!compressing ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">
              {language === "pt" ? "Origem" : "Source"}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label={language === "pt" ? "Origem do arquivo" : "Where the archive comes from"}
                className="inline-flex rounded-lg border border-border-interactive p-0.5"
              >
                {(["file", "text"] as Source[]).map((option) => {
                  const current = option === source;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={current}
                      onClick={() => changeSource(option)}
                      className={cn(
                        "rounded-md px-3 py-1 text-sm transition-colors",
                        current
                          ? "bg-accent-solid font-medium text-accent-foreground"
                          : "text-text-muted hover:text-text",
                      )}
                    >
                      {option === "file"
                        ? (language === "pt" ? "Arquivo" : "File")
                        : (language === "pt" ? "Texto" : "Text")}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-muted">
                {source === "file"
                  ? (language === "pt" ? "Escolhido do disco ou arrastado." : "Chosen from disk or dragged in.")
                  : (language === "pt"
                      ? "Base64, hexadecimal ou data: URL — a codificação é detectada."
                      : "Base64, hex, or a data: URL — the encoding is detected.")}
              </p>
            </div>
          </section>
        ) : null}

        {source === "text" && !compressing ? (
          <section className="flex flex-col gap-3">
            <label htmlFor={pasteId} className="text-xs uppercase tracking-wide text-text-muted">
              {language === "pt" ? "Conteúdo codificado" : "Encoded contents"}
            </label>
            <textarea
              id={pasteId}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="UEsDBAoAAAAAAA..."
              aria-describedby={error ? errorId : undefined}
              className="min-h-32 w-full resize-y rounded-xl border border-border-interactive bg-surface-raised p-4 font-mono text-sm leading-relaxed text-text placeholder:text-text-muted md:min-h-40"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={readPasted}
                disabled={busy || pasted.trim() === ""}
              >
                {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
                <span>{language === "pt" ? "Abrir" : "Open"}</span>
              </Button>
              {pasted !== "" ? (
                <Button variant="ghost" size="sm" onClick={() => { setPasted(""); reset(); }}>
                  <X aria-hidden />
                  <span>{language === "pt" ? "Limpar" : "Clear"}</span>
                </Button>
              ) : null}
              {pastedNote ? <p className="text-xs text-text-muted">{pastedNote}</p> : null}
            </div>
          </section>
        ) : (
        <section className="flex flex-col gap-3">
          <label
            htmlFor={inputId}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => {
              // Só sai do estado quando o ponteiro deixa a área inteira, não ao
              // cruzar a fronteira de um filho.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed bg-surface-raised px-4 py-10 text-center transition-colors hover:border-accent hover:bg-surface",
              dragging ? "border-accent bg-surface" : "border-border-interactive",
            )}
          >
            <Upload aria-hidden className={cn("size-5", dragging ? "text-accent-text" : "text-text-muted")} />
            <span className="text-sm text-text">
              {dragging
                ? (language === "pt" ? "Solte para começar" : "Drop to start")
                : mode === "compress"
                ? (language === "pt" ? "Arraste os arquivos aqui ou clique para escolher" : "Drag files here or click to choose")
                : (language === "pt" ? "Arraste o arquivo aqui ou clique para escolher" : "Drag an archive here or click to choose")}
            </span>
            <span className="text-xs text-text-muted">
              {acceptsMany
                ? (language === "pt" ? "Vários arquivos podem ser selecionados de uma vez." : "You can select several files at once.")
                : (language === "pt" ? "Um arquivo por vez." : "One file at a time.")}
            </span>
            {mode === "decompress" ? (
              <span className="max-w-lg text-xs text-text-muted">
                {language === "pt"
                  ? <>ZIP, GZIP e TAR rodam localmente até {formatBytes(CLIENT_MAX_BYTES)}. ZSTD, RAR e 7Z usam o servidor.</>
                  : <>ZIP, GZIP, and TAR run locally up to {formatBytes(CLIENT_MAX_BYTES)}. ZSTD, RAR, and 7Z use the server.</>}
              </span>
            ) : null}
          </label>

          <input
            id={inputId}
            type="file"
            multiple={acceptsMany}
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
        )}

        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        {files.length > 0 && mode === "compress" ? (
          <section className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onClick={runCompress} disabled={compressDisabled}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              <span>{language === "pt" ? "Compactar em" : "Compress to"} {FORMATS[format].label}</span>
            </Button>

            {FORMATS[format].levels ? (
              <p className="text-xs text-text-muted">
                {language === "pt" ? PRESET_LABELS[preset] : ({ fast: "Fast", balanced: "Balanced", max: "Maximum", custom: "Custom" }[preset])} — {language === "pt" ? "nível" : "level"} {level} {language === "pt" ? "de" : "of"} {FORMATS[format].levels.min}–
                {FORMATS[format].levels.max}
              </p>
            ) : null}

            {busy ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X aria-hidden />
                <span>{language === "pt" ? "Cancelar" : "Cancel"}</span>
              </Button>
            ) : null}
          </section>
        ) : null}

        {archive ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-wide text-text-muted">
              {language === "pt" ? "Conteúdo" : "Contents"} ({FORMATS[archive.format].label})
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
                      ? language === "pt" ? ` · comprimido ${formatBytes(entry.compressedSize)}` : ` · compressed ${formatBytes(entry.compressedSize)}`
                      : ""}
                  </span>
                  {entry.directory ? (
                    <span className="text-xs text-text-muted">{language === "pt" ? "pasta" : "folder"}</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extractEntry(archive.single ? undefined : entry.name)}
                      disabled={busy}
                    >
                      {language === "pt" ? "Extrair" : "Extract"}
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
              <span>{language === "pt" ? "Baixar" : "Download"} {result.name}</span>
            </Button>
            <p className="font-mono text-xs text-text-muted">
              {formatBytes(result.bytes.length)}
              {mode === "compress" && totalSize > 0
                ? language === "pt" ? ` · ${Math.round((result.bytes.length / totalSize) * 100)}% do original` : ` · ${Math.round((result.bytes.length / totalSize) * 100)}% of original`
                : ""}
            </p>
          </section>
        ) : null}

        <AdvancedOptions options={levelOptions} values={options} onChange={setOption} />

        <PythonScriptPanel mode={compressing ? "compress" : "decompress"} format={activeFormat} level={level} />

        <footer className="mt-2 border-t border-border pt-4 text-center">
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
function backendUnavailable(routing: RoutingDecision, language: "pt" | "en"): string {
  return language === "pt"
    ? `Esta operação precisa do servidor (${routing.reason}), que ainda não está disponível. Enquanto isso, use um arquivo dentro do limite local ou outro formato.`
    : `This operation needs the server (${routing.reason}), which is not available yet. Use a file within the local limit or another format.`;
}

export { clampLevel };
