import type { EngineResult, OptionValues } from "../operations/types.ts";
import { fromBase64, fromHex, toBase64, toHex } from "./bytes.ts";
import { OperationError } from "./errors.ts";

/**
 * PEM ⇄ DER.
 *
 * DER é binário, e um painel de texto não o comporta — a representação usada
 * na tela é hexadecimal, que é reversível byte a byte e legível o suficiente
 * para conferir um cabeçalho de estrutura.
 */

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END ([A-Z0-9 ]+)-----/;

export function pemToDer(input: string): EngineResult {
  if (input.trim() === "") return "";

  const match = PEM_BLOCK.exec(input);

  if (!match) {
    throw new OperationError(
      "Nenhum bloco PEM encontrado. Um bloco começa com -----BEGIN <RÓTULO>----- e termina com -----END <RÓTULO>-----.",
    );
  }

  const [, beginLabel, body, endLabel] = match;

  if (beginLabel !== endLabel) {
    throw new OperationError(
      `O rótulo de abertura ("${beginLabel}") não bate com o de fechamento ("${endLabel}").`,
    );
  }

  const bytes = fromBase64(body.replace(/\s+/g, ""), "standard");
  const notes = [`Rótulo do bloco: ${beginLabel}.`, `${bytes.length} bytes DER.`];

  const remaining = input.slice(match.index + match[0].length);
  if (PEM_BLOCK.test(remaining)) {
    notes.push(
      "A entrada tem mais de um bloco PEM; apenas o primeiro foi convertido.",
    );
  }

  return { output: toHex(bytes), notes };
}

export function derToPem(input: string, options: OptionValues): EngineResult {
  if (input.trim() === "") return "";

  const label =
    typeof options.label === "string" && options.label !== ""
      ? options.label
      : "CERTIFICATE";

  const bytes = fromHex(input);
  if (bytes.length === 0) {
    throw new OperationError("Nenhum byte para converter.");
  }

  const base64 = toBase64(bytes, "standard", true);
  // O PEM quebra o corpo em linhas de 64 colunas (RFC 7468).
  const lines = base64.match(/.{1,64}/g) ?? [];

  return {
    output: [
      `-----BEGIN ${label}-----`,
      ...lines,
      `-----END ${label}-----`,
      "",
    ].join("\n"),
    notes: [`${bytes.length} bytes DER codificados no rótulo ${label}.`],
  };
}
