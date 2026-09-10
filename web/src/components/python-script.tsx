"use client";

import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { DECOMPRESSIBLE_FORMATS, FORMATS, type FormatId } from "@/lib/compression/formats";
import { pythonScript, type ScriptMode } from "@/lib/compression/scripts";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

/**
 * O mesmo trabalho, fora daqui.
 *
 * Esta tela tem teto: o que passa do limite vai para o servidor, e o que passa
 * da paciência do navegador não vai a lugar nenhum. Um arquivo de dezenas de
 * gigabytes, uma pasta inteira ou uma rotina que se repete toda semana pedem
 * outra ferramenta — e a resposta honesta é entregar o script em vez de
 * empurrar o limite.
 *
 * Nasce recolhido: quem só quer compactar um arquivo nunca precisa abrir.
 */
export function PythonScriptPanel({
  mode,
  format,
  level,
}: {
  mode: ScriptMode;
  /** Ao compactar, o formato escolhido na tela; ao descompactar, o detectado. */
  format: FormatId;
  level: number;
}) {
  const { language } = useLanguage();
  const [chosen, setChosen] = useState<FormatId | undefined>();
  const [seen, setSeen] = useState(format);

  // Detectar um arquivo manda no painel: se o formato da tela mudou, a escolha
  // manual anterior deixou de fazer sentido. O ajuste é na renderização, e não
  // num efeito, para não pintar uma vez com a escolha velha antes de corrigir.
  if (format !== seen) {
    setSeen(format);
    setChosen(undefined);
  }

  const decompressing = mode === "decompress";
  const active = decompressing ? chosen ?? format : format;
  const script = pythonScript(active, mode, level, language);
  const pt = language === "pt";

  return (
    <details className="group rounded-md border border-border bg-surface-raised px-3 py-2.5">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-text transition-colors hover:text-accent-text [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        <Terminal aria-hidden className="size-3.5" />
        {pt ? "Script Python para rodar localmente" : "Python script to run locally"}
      </summary>

      <div className="flex flex-col gap-4 pt-4">
        <p className="max-w-2xl text-xs text-text-muted">
          {pt
            ? "Faz a mesma coisa que esta tela, na sua máquina, sem limite de tamanho e sem passar por aqui. Copie, salve e rode."
            : "Does what this screen does, on your own machine, with no size limit and without going through here. Copy it, save it, run it."}
        </p>

        {decompressing ? (
          <div
            role="group"
            aria-label={pt ? "Formato do script" : "Script format"}
            className="inline-flex flex-wrap self-start rounded-lg border border-border-interactive p-0.5"
          >
            {DECOMPRESSIBLE_FORMATS.map((option) => (
              <FormatTab
                key={option}
                format={option}
                current={option === active}
                onSelect={setChosen}
              />
            ))}
          </div>
        ) : null}

        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-xs text-text-muted marker:text-text-muted">
          {script.requires ? (
            <li>
              {pt ? "Instale a dependência:" : "Install the dependency:"}{" "}
              <code className="font-mono text-text">{script.requires}</code>
            </li>
          ) : null}
          <li>
            {pt ? "Salve o script como" : "Save the script as"}{" "}
            <code className="font-mono text-text">{script.filename}</code>
            {script.minPython
              ? pt
                ? ` — precisa do Python ${script.minPython} ou mais novo.`
                : ` — needs Python ${script.minPython} or newer.`
              : "."}
          </li>
          <li>
            {pt ? "Rode:" : "Run it:"}{" "}
            <code className="font-mono text-text">{script.usage}</code>
          </li>
        </ol>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-1.5">
            <span className="font-mono text-xs text-text-muted">{script.filename}</span>
            <CopyButton
              value={script.code}
              label={{ pt: "script Python", en: "Python script" }}
            />
          </div>
          <pre className="max-h-96 overflow-auto bg-surface px-3 py-3 font-mono text-xs leading-relaxed text-text">
            <code>{script.code}</code>
          </pre>
        </div>
      </div>
    </details>
  );
}

function FormatTab({
  format,
  current,
  onSelect,
}: {
  format: FormatId;
  current: boolean;
  onSelect: (format: FormatId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={current}
      onClick={() => onSelect(format)}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        current
          ? "bg-accent-solid font-medium text-accent-foreground"
          : "text-text-muted hover:text-text",
      )}
    >
      {FORMATS[format].label}
    </button>
  );
}
