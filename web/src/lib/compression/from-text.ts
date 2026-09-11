import { OperationError } from "../engines/errors.ts";
import { fromBase64, fromHex } from "../engines/bytes.ts";
import { describeSignature, detectFormat } from "./detect.ts";
import { FORMATS, type FormatId } from "./formats.ts";

/**
 * Leitura de um arquivo compactado colado como texto.
 *
 * Um arquivo compactado é binário; para viajar como texto ele foi codificado
 * antes — quase sempre em Base64, às vezes como data URL ou dump hexadecimal.
 * Qual das três não se pergunta ao usuário: tenta-se cada uma e vence a que
 * produzir bytes com assinatura de formato conhecida.
 *
 * O que torna esse palpite seguro é a validação: não se aceita a decodificação
 * porque os caracteres "pareciam" Base64 — aceita-se porque os bytes que ela
 * produziu são de fato um ZIP, um GZIP ou um TAR. Uma leitura errada não passa
 * pelo teste da assinatura.
 */

export type TextEncodingId = "base64" | "base64url" | "hex";

export const TEXT_ENCODING_LABELS: Record<TextEncodingId, string> = {
  base64: "Base64",
  base64url: "Base64 URL-safe",
  hex: "Hexadecimal",
};

export type DecodedArchive = {
  bytes: Uint8Array;
  encoding: TextEncodingId;
  /** Verdadeiro quando a entrada veio embrulhada num data: URL. */
  dataUrl: boolean;
  format: FormatId;
};

/**
 * Teto do texto colado.
 *
 * Não é o limite de tamanho da operação — esse é o `decideRouting`, que age
 * sobre os bytes já decodificados. É um limite do próprio ato de colar:
 * decodificar aloca estruturas intermediárias proporcionais à entrada, e um
 * textarea não é o caminho para dezenas de megabytes. Acima disso o seletor de
 * arquivo faz o mesmo trabalho sem passar tudo pela memória de uma vez.
 */
export const MAX_PASTED_CHARS = 12 * 1024 * 1024;

/** Remove o cabeçalho de um data: URL, devolvendo só o payload. */
function stripDataUrl(input: string): { payload: string; dataUrl: boolean } {
  const match = /^data:[^,]*,/.exec(input);
  if (!match) return { payload: input, dataUrl: false };
  return { payload: input.slice(match[0].length), dataUrl: true };
}

type Attempt = { encoding: TextEncodingId; bytes: Uint8Array };

/**
 * Decodificações plausíveis da entrada, na ordem em que serão testadas.
 *
 * Hexadecimal vem primeiro quando a entrada é estritamente hexadecimal: esse
 * é um sinal forte, e um dump hex também é Base64 válido por acaso, o que
 * tornaria a ordem inversa ambígua.
 */
function attempts(payload: string): Attempt[] {
  const compact = payload.replace(/\s+/g, "");
  const looksHex = compact.length > 0 && compact.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(compact);

  const order: TextEncodingId[] = looksHex
    ? ["hex", "base64", "base64url"]
    : ["base64", "base64url", "hex"];

  const decoded: Attempt[] = [];
  for (const encoding of order) {
    try {
      const bytes =
        encoding === "hex"
          ? fromHex(payload)
          : fromBase64(payload, encoding === "base64url" ? "urlsafe" : "standard");
      if (bytes.length > 0) decoded.push({ encoding, bytes });
    } catch {
      // Não decodifica nessa variante — apenas não entra na lista.
    }
  }
  return decoded;
}

export function decodeArchiveText(input: string): DecodedArchive {
  const trimmed = input.trim();

  if (trimmed === "") {
    throw new OperationError({ code: "error.pasteEmpty" });
  }
  if (trimmed.length > MAX_PASTED_CHARS) {
    throw new OperationError({ code: "error.pasteLarge" });
  }

  const { payload, dataUrl } = stripDataUrl(trimmed);
  const decoded = attempts(payload);

  if (decoded.length === 0) {
    throw new OperationError({ code: "error.pasteEncoding" });
  }

  for (const attempt of decoded) {
    const format = detectFormat(attempt.bytes);
    if (format) {
      return { bytes: attempt.bytes, encoding: attempt.encoding, dataUrl, format };
    }
  }

  // Decodificou, mas os bytes não são de nenhum formato suportado. Vale mais
  // dizer o que saiu do que insistir que a entrada está errada: quem colou um
  // Base64 de um PNG precisa saber que o problema é o conteúdo, não o formato
  // do texto.
  const best = decoded[0];
  throw new OperationError({ code: "error.pasteFormat", params: { encoding: TEXT_ENCODING_LABELS[best.encoding], size: best.bytes.length, signature: describeSignature(best.bytes) } });
}

/** Nome sintético para o conteúdo colado, com a extensão do formato lido. */
export function pastedFileName(format: FormatId, language: "pt" | "en"): string {
  return `${language === "pt" ? "colado" : "pasted"}${FORMATS[format].extension}`;
}
