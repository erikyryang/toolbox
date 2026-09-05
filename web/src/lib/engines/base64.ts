import type { OptionValues } from "../operations/types.ts";
import {
  fromBase64,
  toBase64,
  utf8Decode,
  utf8Encode,
  type Base64Alphabet,
} from "./bytes.ts";

function alphabetOf(options: OptionValues): Base64Alphabet {
  return options.alphabet === "urlsafe" ? "urlsafe" : "standard";
}

export function encodeBase64(input: string, options: OptionValues): string {
  return toBase64(utf8Encode(input), alphabetOf(options), options.padding !== false);
}

export function decodeBase64(input: string, options: OptionValues): string {
  return utf8Decode(fromBase64(input, alphabetOf(options)));
}
