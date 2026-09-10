import type { Engine } from "../operations/types.ts";

/**
 * Junção de linhas: N linhas viram uma, com o separador que a próxima
 * ferramenta espera.
 *
 * O separador chega como identificador, não como o caractere em si — um
 * `value` com tabulação ou espaço literal atravessaria serialização, o DOM e
 * comparações distraídas sem sobreviver inteiro. O texto legível fica no
 * rótulo da opção, que é por onde a tradução casa.
 */

export const SEPARATORS: Record<string, string> = {
  none: "",
  space: " ",
  comma: ",",
  "comma-space": ", ",
  semicolon: ";",
  pipe: "|",
  tab: "\t",
};

export const DEFAULT_SEPARATOR = "comma-space";

/**
 * Nenhuma entrada é inválida: texto livre não tem gramática para violar. O
 * motor nunca lança, e a ordem das etapas é o que faz uma linha de três
 * espaços contar como vazia — aparar antes de descartar.
 */
export const joinLines: Engine = (input, options) => {
  const separator = SEPARATORS[String(options.separator)] ?? SEPARATORS[DEFAULT_SEPARATOR];

  let lines = input.split(/\r\n|\r|\n/);
  if (options.trim === true) lines = lines.map((line) => line.trim());
  if (options.dropEmpty === true) lines = lines.filter((line) => line !== "");

  return lines.join(separator);
};
