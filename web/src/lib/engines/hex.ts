import type { OptionValues } from "../operations/types.ts";
import { fromHex, toHex, utf8Decode, utf8Encode } from "./bytes.ts";

export function encodeHex(input: string, options: OptionValues): string {
  const hex = toHex(utf8Encode(input), options.case === "upper");
  const separator = options.separator === "space" ? " " : "";
  if (!separator) return hex;
  return (hex.match(/.{1,2}/g) ?? []).join(separator);
}

export function decodeHex(input: string): string {
  return utf8Decode(fromHex(input));
}
