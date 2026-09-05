import type { OptionValues } from "../operations/types.ts";
import { utf8Decode, utf8Encode } from "./bytes.ts";
import { OperationError, describeChar } from "./errors.ts";

/**
 * Base32 (RFC 4648) e Base58 (alfabeto Bitcoin).
 *
 * Base32 é posicional em blocos de 5 bits; Base58 é aritmética de base grande,
 * sem blocos — daí os zeros à esquerda precisarem de tratamento próprio, já que
 * não sobrevivem à divisão sucessiva.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// ---------------------------------------------------------------------------
// Base32
// ---------------------------------------------------------------------------

export function toBase32(bytes: Uint8Array, padding = true): string {
  let out = "";
  let buffer = 0;
  let bits = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(buffer >> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }

  if (padding) {
    while (out.length % 8 !== 0) out += "=";
  }

  return out;
}

export function fromBase32(input: string): Uint8Array {
  const compact = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < compact.length; i += 1) {
    const value = BASE32_ALPHABET.indexOf(compact[i]);
    if (value < 0) {
      throw new OperationError(
        `Caractere ${describeChar(compact[i])} não pertence ao alfabeto Base32 (A–Z e 2–7).`,
        i,
      );
    }

    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Uint8Array.from(bytes);
}

export function encodeBase32(input: string, options: OptionValues): string {
  return toBase32(utf8Encode(input), options.padding !== false);
}

export function decodeBase32(input: string): string {
  return utf8Decode(fromBase32(input));
}

// ---------------------------------------------------------------------------
// Base58
// ---------------------------------------------------------------------------

export function toBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  // Zeros à esquerda não sobrevivem à aritmética de base: são contados antes e
  // devolvidos como "1" no fim.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;

  const digits: number[] = [];
  for (const byte of bytes.subarray(zeros)) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      const value = digits[i] * 256 + carry;
      digits[i] = value % 58;
      carry = Math.floor(value / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let out = BASE58_ALPHABET[0].repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += BASE58_ALPHABET[digits[i]];
  }

  return out;
}

export function fromBase58(input: string): Uint8Array {
  const compact = input.replace(/\s+/g, "");
  if (compact === "") return new Uint8Array();

  let zeros = 0;
  while (zeros < compact.length && compact[zeros] === BASE58_ALPHABET[0]) {
    zeros += 1;
  }

  const bytes: number[] = [];
  for (let i = 0; i < compact.length; i += 1) {
    const value = BASE58_ALPHABET.indexOf(compact[i]);
    if (value < 0) {
      const ambiguous = "0OIl".includes(compact[i])
        ? " O alfabeto Base58 omite 0, O, I e l justamente por serem ambíguos."
        : "";
      throw new OperationError(
        `Caractere ${describeChar(compact[i])} não pertence ao alfabeto Base58.${ambiguous}`,
        i,
      );
    }

    if (i < zeros) continue;

    let carry = value;
    for (let j = 0; j < bytes.length; j += 1) {
      const total = bytes[j] * 58 + carry;
      bytes[j] = total & 0xff;
      carry = total >> 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  return Uint8Array.from([...new Array<number>(zeros).fill(0), ...bytes.reverse()]);
}

export function encodeBase58(input: string): string {
  return toBase58(utf8Encode(input));
}

export function decodeBase58(input: string): string {
  return utf8Decode(fromBase58(input));
}
