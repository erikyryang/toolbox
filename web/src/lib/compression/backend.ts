"use client";

import type { Archive } from "./codecs.ts";
import type { FormatId } from "./formats.ts";

/**
 * Cliente do backend de compactação.
 *
 * Só é acionado quando a decisão de roteamento diz `server` — arquivo acima do
 * limite local, RAR, 7Z, compressão em XZ/BZIP2 ou ZSTD em nível alto. Se o
 * endereço não estiver configurado, o backend simplesmente não existe para
 * esta instalação, e a interface diz isso em vez de tentar e falhar.
 */

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export function backendAvailable(): boolean {
  return BACKEND_URL !== "";
}

type ErrorBody = { error?: string };

async function failure(response: Response): Promise<Error> {
  let message = `O servidor respondeu ${response.status}.`;
  try {
    const body = (await response.json()) as ErrorBody;
    if (body.error) message = body.error;
  } catch {
    // Resposta sem JSON: a mensagem padrão já basta.
  }

  if (response.status === 413) {
    return new Error(`${message} Tente um arquivo menor.`);
  }
  if (response.status === 429 || response.status === 503) {
    const retry = response.headers.get("Retry-After");
    return new Error(
      `${message}${retry ? ` Tente de novo em ${retry} segundos.` : ""}`,
    );
  }
  return new Error(message);
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
  files: { name: string; data: ArrayBuffer }[],
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const form = new FormData();
  for (const file of files) {
    form.append("file", new Blob([file.data]), file.name);
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
  if (!response.ok) throw await failure(response);

  return new Uint8Array(await response.arrayBuffer());
}

export async function inspectOnServer(
  data: ArrayBuffer,
  signal?: AbortSignal,
): Promise<Archive> {
  const response = await fetch(
    `${BACKEND_URL}/v1/inspect`,
    requestInit(data, signal),
  );
  if (!response.ok) throw await failure(response);

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
  data: ArrayBuffer,
  entryName: string | undefined,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const query = entryName ? `?entry=${encodeURIComponent(entryName)}` : "";
  const response = await fetch(
    `${BACKEND_URL}/v1/extract${query}`,
    requestInit(data, signal),
  );
  if (!response.ok) throw await failure(response);

  return new Uint8Array(await response.arrayBuffer());
}
