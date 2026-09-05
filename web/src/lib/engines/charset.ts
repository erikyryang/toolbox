import type { EngineResult, OptionValues } from "../operations/types.ts";
import { utf8Encode } from "./bytes.ts";

/**
 * Conversão de charset entre UTF-8 e Latin-1 (ISO-8859-1).
 *
 * O modelo é explícito em duas etapas: o texto é *codificado* em um charset e
 * os bytes resultantes são *lidos* como outro. É essa composição que conserta
 * mojibake — bytes UTF-8 lidos como Latin-1 voltam ao original quando a
 * operação é aplicada no sentido inverso.
 */

export type Charset = "utf-8" | "latin-1";

function charsetOf(value: unknown, fallback: Charset): Charset {
  return value === "utf-8" || value === "latin-1" ? value : fallback;
}

/** Latin-1 representa exatamente os pontos de código U+0000 a U+00FF. */
function encodeLatin1(text: string): { bytes: Uint8Array; unrepresentable: { char: string; index: number }[] } {
  const bytes = new Uint8Array(text.length);
  const unrepresentable: { char: string; index: number }[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      unrepresentable.push({ char: text[i], index: i });
      bytes[i] = 0x3f; // "?"
    } else {
      bytes[i] = code;
    }
  }

  return { bytes, unrepresentable };
}

export function convertCharset(input: string, options: OptionValues): EngineResult {
  if (input === "") return "";

  const encodeAs = charsetOf(options.encodeAs, "latin-1");
  const readAs = charsetOf(options.readAs, "utf-8");
  const notes: string[] = [];

  let bytes: Uint8Array;
  if (encodeAs === "utf-8") {
    bytes = utf8Encode(input);
  } else {
    const encoded = encodeLatin1(input);
    bytes = encoded.bytes;

    for (const { char, index } of encoded.unrepresentable.slice(0, 5)) {
      notes.push(
        `O caractere "${char}" (posição ${index}) não existe em Latin-1 e virou "?".`,
      );
    }
    if (encoded.unrepresentable.length > 5) {
      notes.push(
        `Mais ${encoded.unrepresentable.length - 5} caracteres não representáveis em Latin-1.`,
      );
    }
  }

  const label = readAs === "utf-8" ? "utf-8" : "iso-8859-1";
  // Latin-1 nunca falha: todo byte tem um caractere. UTF-8 pode encontrar
  // sequências inválidas, e nesse caso o decodificador insere U+FFFD.
  const output = new TextDecoder(label).decode(bytes);

  if (readAs === "utf-8" && output.includes("�")) {
    notes.push(
      "A leitura como UTF-8 encontrou bytes inválidos, marcados com �. Confira se o charset de origem está correto.",
    );
  }

  return { output, notes };
}

export function convertCharsetReversed(
  input: string,
  options: OptionValues,
): EngineResult {
  // Inverter a operação é trocar os dois charsets de papel.
  return convertCharset(input, {
    ...options,
    encodeAs: charsetOf(options.readAs, "utf-8"),
    readAs: charsetOf(options.encodeAs, "latin-1"),
  });
}
