import type { OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Escapes Unicode.
 *
 * O ponto delicado são os caracteres fora do BMP: no estilo `\uXXXX` eles só
 * existem como par substituto, enquanto `\u{...}` representa o código inteiro.
 * Iterar por code point (for..of) em vez de por unidade de código é o que
 * mantém os dois estilos corretos.
 */

function hex(value: number, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, "0");
}

export function escapeUnicode(input: string, options: OptionValues): string {
  const style = typeof options.style === "string" ? options.style : "u4";
  const onlyNonAscii = options.onlyNonAscii !== false;

  let out = "";
  for (const char of input) {
    const code = char.codePointAt(0) ?? 0;

    if (onlyNonAscii && code < 0x80) {
      out += char;
      continue;
    }

    if (style === "brace") {
      out += `\\u{${hex(code, 1)}}`;
      continue;
    }

    if (style === "x2") {
      if (code > 0xff) {
        throw new OperationError(
          `O estilo \\xXX só alcança até U+00FF; o caractere U+${hex(code, 4)} não cabe nele.`,
        );
      }
      out += `\\x${hex(code, 2)}`;
      continue;
    }

    // Estilo \uXXXX: fora do BMP, o caractere vira o par substituto.
    for (let i = 0; i < char.length; i += 1) {
      out += `\\u${hex(char.charCodeAt(i), 4)}`;
    }
  }

  return out;
}

export function unescapeUnicode(input: string): string {
  return input.replace(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g,
    (match, braced?: string, quad?: string, byte?: string) => {
      const digits = braced ?? quad ?? byte ?? "";
      const code = parseInt(digits, 16);

      if (code > 0x10ffff) {
        throw new OperationError(
          `A sequência ${match} está fora do intervalo Unicode (máximo U+10FFFF).`,
          input.indexOf(match),
        );
      }

      return String.fromCodePoint(code);
    },
  );
}
