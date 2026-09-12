"use client";

import type { Archive } from "./codecs.ts";
import type { FormatId } from "./formats.ts";
import { OperationError } from "../engines/errors.ts";
import type { Feedback } from "../messages.ts";

/**
 * Cliente do backend de compactação.
 *
 * Só é acionado quando a decisão de roteamento diz `server` — arquivo acima do
 * limite local, RAR, 7Z ou ZSTD em nível alto. Se o
 * endereço não estiver configurado, o backend simplesmente não existe para
 * esta instalação, e a interface diz isso em vez de tentar e falhar.
 */

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export function backendAvailable(): boolean {
  return BACKEND_URL !== "";
}

/**
 * O status é o contrato. A frase que o servidor manda no corpo vem no idioma
 * dele, pode conter qualquer coisa e não é exibida — o código é escolhido
 * aqui e traduzido na apresentação.
 */
export function failure(response: Response): OperationError {
  const retryAfter = response.headers.get("Retry-After");
  const feedback: Feedback = {
    code: response.status === 413 ? "error.httpTooLarge"
      : response.status === 429 || response.status === 503 ? "error.httpBusy" : "error.http",
    params: { status: response.status, ...(retryAfter ? { retryAfter } : {}) },
  };
  return new OperationError(feedback);
}

function requestInit(body: BodyInit, signal?: AbortSignal): RequestInit {
  return {
    method: "POST",
    body,
    signal,
    // Nada do que trafega aqui deve ser guardado por navegador ou proxy.
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  };
}

export async function compressOnServer(
  format: FormatId,
  preset: string,
  level: number,
  files: { name: string; data: Blob | ArrayBuffer }[],
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const form = new FormData();
  for (const file of files) {
    form.append("file", file.data instanceof Blob ? file.data : new Blob([file.data]), file.name);
  }

  const query = new URLSearchParams({
    format,
    preset,
    level: String(level),
  });

  const response = await fetch(
    `${BACKEND_URL}/v1/compress?${query}`,
    requestInit(form, signal),
  );
  if (!response.ok) throw failure(response);

  return new Uint8Array(await response.arrayBuffer());
}

export async function inspectOnServer(
  data: Blob | ArrayBuffer,
  signal?: AbortSignal,
): Promise<Archive> {
  const response = await fetch(
    `${BACKEND_URL}/v1/inspect`,
    requestInit(data, signal),
  );
  if (!response.ok) throw failure(response);

  const listing = (await response.json()) as {
    format: FormatId;
    entries: { name: string; size: number; compressedSize?: number; directory: boolean }[];
    single: boolean;
  };

  return {
    format: listing.format,
    single: listing.single,
    entries: listing.entries ?? [],
  };
}

export async function extractOnServer(
  data: Blob | ArrayBuffer,
  entryName: string | undefined,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const query = entryName ? `?entry=${encodeURIComponent(entryName)}` : "";
  const response = await fetch(
    `${BACKEND_URL}/v1/extract${query}`,
    requestInit(data, signal),
  );
  if (!response.ok) throw failure(response);

  return new Uint8Array(await response.arrayBuffer());
}
