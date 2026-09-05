import type { EngineResult, OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Unix timestamp.
 *
 * A unidade é detectada pelo número de dígitos: 13 dígitos são milissegundos,
 * 10 são segundos. A detecção é exibida na saída — adivinhar em silêncio seria
 * a pior das opções quando o resultado difere por três ordens de grandeza.
 */

function formatLocal(date: Date): string {
  // O fuso do navegador; no servidor, durante a pré-renderização, é UTC.
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local";
}

export function timestampToDate(input: string, options: OptionValues): EngineResult {
  const raw = input.trim();
  if (raw === "") return "";

  if (!/^-?\d+$/.test(raw)) {
    throw new OperationError(
      "Um timestamp Unix é um número inteiro de segundos ou milissegundos.",
    );
  }

  const digits = raw.replace("-", "").length;
  const unitOption = typeof options.unit === "string" ? options.unit : "auto";
  const unit =
    unitOption === "auto" ? (digits >= 12 ? "ms" : "s") : unitOption;

  const milliseconds = unit === "ms" ? Number(raw) : Number(raw) * 1000;
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    throw new OperationError(
      "O valor está fora do intervalo de datas representável.",
    );
  }

  const notes =
    unitOption === "auto"
      ? [
          `Unidade detectada pelo número de dígitos: ${
            unit === "ms" ? "milissegundos" : "segundos"
          }. Ajuste nas opções avançadas se estiver errado.`,
        ]
      : [];

  return {
    output: [
      `ISO 8601 (UTC)  ${date.toISOString()}`,
      `UTC             ${date.toUTCString()}`,
      `Local (${localZone()})  ${formatLocal(date)}`,
      `Segundos        ${Math.floor(milliseconds / 1000)}`,
      `Milissegundos   ${milliseconds}`,
    ].join("\n"),
    notes,
  };
}

export function dateToTimestamp(input: string, options: OptionValues): EngineResult {
  const raw = input.trim();
  if (raw === "") return "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new OperationError(
      'Data não reconhecida. Formatos aceitos incluem ISO 8601 ("2024-01-31T12:00:00Z") e "31 Jan 2024 12:00 UTC".',
    );
  }

  const milliseconds = date.getTime();
  const unit = typeof options.unit === "string" && options.unit === "ms" ? "ms" : "s";

  return {
    output:
      unit === "ms" ? String(milliseconds) : String(Math.floor(milliseconds / 1000)),
    notes: [
      `Interpretado como ${date.toISOString()}.`,
      ...(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
        ? []
        : [
            `A data não trazia fuso; foi lida no fuso local (${localZone()}).`,
          ]),
    ],
  };
}
