"use client";

import { useCallback, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import { feedbackOf, localizeFeedback, message, type Feedback } from "@/lib/messages";

import { FileInput } from "@/components/file-input";
import { FileResults } from "@/components/file-results";
import { AdvancedOptions } from "@/components/advanced-options";
import { PrivacyNote } from "@/components/privacy-note";
import { PythonScriptPanel } from "@/components/python-script";
import { OperationHeading } from "@/components/operation-heading";
import { Button } from "@/components/ui/button";
import { backendAvailable } from "@/lib/compression/backend";
import { useFileOperation } from "@/hooks/use-file-operation";
import type { SelectedFile } from "@/lib/compression/file-controller";
import {
  COMPRESSIBLE_FORMATS,
  FORMATS,
  clampLevel,
  levelForPreset,
  type FormatId,
  type Preset,
} from "@/lib/compression/formats";
import { TEXT_ENCODING_LABELS, decodeArchiveText, pastedFileName } from "@/lib/compression/from-text";
import { levelOptionsFor } from "@/lib/operations/compression-catalog";
import { decideRouting, formatBytes, type RoutingDecision } from "@/lib/compression/limits";
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
  const { files, archive, detectedFormat, result, feedback: operationError, busy, controller } = useFileOperation();
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<Source>("file");
  const [pasted, setPasted] = useState("");
  const [pastedNote, setPastedNote] = useState<Feedback | undefined>();
  const [error, setError] = useState<Feedback | undefined>();
  const visibleError = error ?? operationError;

  const inputId = useId();
  const pasteId = useId();
  const errorId = useId();
  const messages = {
    unavailable: () => message("en", "error.backendUnavailable"),
    read: message("en", "error.unknown"),
    compress: message("en", "error.unknown"),
    extract: message("en", "error.unknown"),
  };

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
    setOptions((current) => ({ ...optionValuesFor(next), preset: current.preset ?? "balanced" }));

    const dropping = !FORMATS[next].container && files.length > 1;
    const kept = dropping ? [files[0]] : files;
    controller.configure(kept);
    setError(
      dropping
        ? { code: "note.filesDropped", params: { format: FORMATS[next].label, name: kept[0].name } }
        : undefined,
    );
  }

  const setOption = useCallback((id: string, value: OptionValue) => {
    controller.configure();
    setOptions((current) => ({ ...current, [id]: value }));
  }, [controller]);

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
    controller.reset();
    setError(undefined);
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
    controller.reset();
    setPastedNote(undefined);

    let decoded;
    try {
      decoded = decodeArchiveText(pasted);
    } catch (failure) {
      setError(feedbackOf(failure));
      return;
    }

    const name = pastedFileName(decoded.format, language);
    // A cópia isola os bytes do buffer do worker, que pode ser transferido.
    const selected: SelectedFile = {
      name,
      size: decoded.bytes.length,
      blob: new Blob([decoded.bytes.slice().buffer as ArrayBuffer]),
    };

    setPastedNote({
      code: decoded.dataUrl ? "note.pastedDataUrl" : "note.pasted",
      params: { encoding: TEXT_ENCODING_LABELS[decoded.encoding], format: FORMATS[decoded.format].label, size: formatBytes(selected.size) },
    });
    await controller.select([selected], true, messages, decoded.format);
  }

  async function onSelect(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(undefined);
    setPastedNote(undefined);
    const incoming = acceptsMany ? Array.from(list) : [list[0]];
    await controller.select(incoming.map((file) => ({ name: file.name, size: file.size, blob: file })), !compressing, messages);
  }

  async function runCompress() {
    setError(undefined);
    await controller.compress(format, preset, level, messages);
  }

  async function extractEntry(entryName?: string) {
    setError(undefined);
    await controller.extract(entryName, messages);
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
      <OperationHeading
        slug={operation.slug}
        title={operation.title}
        subtitle={operation.subtitle}
      />

      <div className="mt-10 flex flex-col gap-6">
        {compressing ? (
          <section className="flex flex-col gap-2">
            <h2 className="section-title">
              {message(language, "ui.format")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label={message(language, "ui.outputFormat")}
                className="inline-flex flex-wrap rounded-md border border-border-interactive p-0.5"
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
                  ? (message(language, "ui.holdsSeveralFiles"))
                  : (message(language, "ui.oneFileAtATime"))}
                {FORMATS[format].levels
                  ? message(language, "ui.levelRange", { min: FORMATS[format].levels.min, max: FORMATS[format].levels.max })
                  : (message(language, "ui.noCompression"))}
              </p>
            </div>
          </section>
        ) : null}

        {!compressing ? (
          <section className="flex flex-col gap-2">
            <h2 className="section-title">
              {message(language, "ui.source")}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label={message(language, "ui.sourceGroup")}
                className="inline-flex rounded-md border border-border-interactive p-0.5"
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
                        ? (message(language, "ui.file"))
                        : (message(language, "ui.text"))}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-text-muted">
                {source === "file"
                  ? (message(language, "ui.sourceFileHint"))
                  : (message(language, "ui.sourceTextHint"))}
              </p>
            </div>
          </section>
        ) : null}

        {source === "text" && !compressing ? (
          <section className="flex flex-col gap-3">
            <label htmlFor={pasteId} className="section-title">
              {message(language, "ui.encodedContents")}
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
              aria-describedby={visibleError ? errorId : undefined}
              className="min-h-32 w-full resize-y rounded-md border border-border-interactive bg-surface-raised p-4 text-sm leading-relaxed text-text placeholder:text-text-muted md:min-h-40"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={readPasted}
                disabled={busy || pasted.trim() === ""}
              >
                {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
                <span>{message(language, "ui.open")}</span>
              </Button>
              {pasted !== "" ? (
                <Button variant="ghost" size="sm" onClick={() => { setPasted(""); reset(); }}>
                  <X aria-hidden />
                  <span>{message(language, "ui.clear")}</span>
                </Button>
              ) : null}
              {pastedNote ? <p className="text-xs text-text-muted">{localizeFeedback(pastedNote, language)}</p> : null}
            </div>
          </section>
        ) : (
          <FileInput inputId={inputId} errorId={visibleError ? errorId : undefined} dragging={dragging} setDragging={setDragging} onDrop={onDrop} mode={mode} acceptsMany={acceptsMany} onSelect={onSelect} files={files} language={language} />
        )}

        {visibleError ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {localizeFeedback(visibleError, language)}
          </p>
        ) : null}

        {files.length > 0 && mode === "compress" ? (
          <section className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onClick={runCompress} disabled={compressDisabled}>
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
              <span>{message(language, "ui.compressTo")} {FORMATS[format].label}</span>
            </Button>

            {FORMATS[format].levels ? (
              <p className="text-xs text-text-muted">
                {message(language, `ui.preset.${preset}`)} — {message(language, "ui.level")} {level} {message(language, "ui.of")} {FORMATS[format].levels.min}–
                {FORMATS[format].levels.max}
              </p>
            ) : null}

            {busy ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X aria-hidden />
                <span>{message(language, "ui.cancel")}</span>
              </Button>
            ) : null}
          </section>
        ) : null}

        <FileResults archive={archive} result={result} busy={busy} mode={mode} totalSize={totalSize} language={language} onExtract={extractEntry} onDownload={download} />

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
export { clampLevel };
