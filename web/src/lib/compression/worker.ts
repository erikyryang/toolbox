/// <reference lib="webworker" />

import { isOperationError } from "../engines/errors.ts";
import { compress, extract, inspect, type Archive } from "./codecs.ts";
import type { FormatId } from "./formats.ts";

/**
 * Worker de compactação.
 *
 * Compressão e extração saem da main thread por dois motivos: a interface
 * continua respondendo enquanto o trabalho acontece, e encerrar o worker
 * descarrega o módulo WASM junto — o conteúdo do usuário não fica residente na
 * página depois que a operação termina.
 */

export type WorkerRequest =
  | { id: number; kind: "compress"; format: FormatId; level: number; files: { name: string; data: ArrayBuffer }[] }
  | { id: number; kind: "inspect"; data: ArrayBuffer; fileName?: string }
  | { id: number; kind: "extract"; data: ArrayBuffer; archive: Archive; entryName?: string };

export type WorkerResponse =
  | { id: number; ok: true; kind: "compress"; data: ArrayBuffer }
  | { id: number; ok: true; kind: "inspect"; archive: Archive }
  | { id: number; ok: true; kind: "extract"; data: ArrayBuffer }
  | { id: number; ok: false; error: string };

function toBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/** Devolve um ArrayBuffer próprio, transferível sem cópia. */
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.kind === "compress") {
      const data = await compress({
        format: request.format,
        level: request.level,
        files: request.files.map((file) => ({
          name: file.name,
          data: toBytes(file.data),
        })),
      });
      const buffer = toBuffer(data);
      const response: WorkerResponse = { id: request.id, ok: true, kind: "compress", data: buffer };
      self.postMessage(response, [buffer]);
      return;
    }

    if (request.kind === "inspect") {
      const archive = await inspect(toBytes(request.data), request.fileName);
      // O payload fica no worker: ele existe para poupar uma descompressão,
      // não para atravessar a fronteira e ser copiado.
      const response: WorkerResponse = {
        id: request.id,
        ok: true,
        kind: "inspect",
        archive: { ...archive, payload: undefined },
      };
      self.postMessage(response);
      return;
    }

    const data = await extract(toBytes(request.data), request.archive, request.entryName);
    const buffer = toBuffer(data);
    const response: WorkerResponse = { id: request.id, ok: true, kind: "extract", data: buffer };
    self.postMessage(response, [buffer]);
  } catch (error) {
    const response: WorkerResponse = {
      id: request.id,
      ok: false,
      error: isOperationError(error)
        ? error.message
        : error instanceof Error
          ? `A operação falhou: ${error.message}`
          : "A operação falhou por um motivo inesperado.",
    };
    self.postMessage(response);
  }
};
