import type { OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Percent-encoding. A distinção entre componente e URI completa importa:
 * `encodeURIComponent` escapa os separadores (`&`, `=`, `/`, `?`), enquanto
 * `encodeURI` os preserva por serem estruturais na URL.
 */

export function encodeUrl(input: string, options: OptionValues): string {
  const encoded =
    options.scope === "uri" ? encodeURI(input) : encodeURIComponent(input);
  return options.plusForSpace === true
    ? encoded.replace(/%20/g, "+")
    : encoded;
}

export function decodeUrl(input: string, options: OptionValues): string {
  const prepared =
    options.plusForSpace === true ? input.replace(/\+/g, " ") : input;

  // Localiza a sequência inválida antes de decodificar, para poder apontar
  // onde está o problema em vez de devolver "URI malformed".
  const invalid = /%(?![0-9a-fA-F]{2})/.exec(prepared);
  if (invalid) {
    const excerpt = prepared.slice(invalid.index, invalid.index + 3);
    throw new OperationError(
      `Sequência percentual inválida "${excerpt}" na posição ${invalid.index}. Depois de % são esperados dois dígitos hexadecimais.`,
      invalid.index,
    );
  }

  try {
    return options.scope === "uri"
      ? decodeURI(prepared)
      : decodeURIComponent(prepared);
  } catch {
    throw new OperationError(
      "A entrada contém uma sequência percent-encoded que não forma texto UTF-8 válido.",
    );
  }
}
