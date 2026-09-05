/**
 * Erro de operação: mensagem legível, exibida como texto simples abaixo do
 * campo de entrada. Nunca vira toast, modal ou alerta.
 */
export class OperationError extends Error {
  /** Posição (base 0) na entrada onde o problema foi detectado, se houver. */
  readonly position?: number;

  constructor(message: string, position?: number) {
    super(message);
    this.name = "OperationError";
    this.position = position;
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
