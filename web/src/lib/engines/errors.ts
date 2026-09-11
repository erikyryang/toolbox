/**
 * Erro de operação: um código do catálogo e seus parâmetros, exibidos como
 * texto simples abaixo do campo de entrada. Nunca vira toast, modal ou alerta.
 *
 * O motor não conhece o idioma de quem lê — quem resolve o código é a
 * apresentação. `Error.message` fica em inglês, para log e devtools; a
 * interface nunca o mostra.
 */
import { message, type Feedback } from "../messages.ts";

export class OperationError extends Error {
  /** Posição (base 0) na entrada onde o problema foi detectado, se houver. */
  readonly position?: number;
  readonly feedback: Feedback;

  constructor(feedback: Feedback, position = feedback.position) {
    super(message("en", feedback.code, feedback.params));
    this.name = "OperationError";
    this.position = position;
    this.feedback = { ...feedback, position };
  }
}

export function isOperationError(error: unknown): error is OperationError {
  return error instanceof OperationError;
}

/** Descreve um caractere para mensagens de erro, sem ecoar a entrada inteira. */
export function describeChar(char: string): string {
  const code = char.codePointAt(0) ?? 0;
  const hex = code.toString(16).toUpperCase().padStart(4, "0");
  const printable = code > 0x20 && code !== 0x7f;
  return printable ? `"${char}" (U+${hex})` : `U+${hex}`;
}
