"use client";

import type { Archive } from "./codecs.ts";
import type { FormatId } from "./formats.ts";
import type { WorkerRequest, WorkerResponse } from "./worker.ts";

/** Omit sobre união precisa distribuir, ou os ramos colapsam num tipo só. */
type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

/**
 * Ponte com o worker de compactação.
 *
 * O worker é criado sob demanda e encerrado ao sair da tela: enquanto não há
 * arquivo, nem o WASM nem o conteúdo do usuário ocupam memória da página.
 */

export class CompressionClient {
  #worker: Worker | undefined;
  #nextId = 1;
  #pending = new Map<
    number,
    { resolve: (response: WorkerResponse) => void; reject: (error: Error) => void }
  >();

  #ensureWorker(): Worker {
    if (!this.#worker) {
      this.#worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.#worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const entry = this.#pending.get(event.data.id);
        if (!entry) return;
        this.#pending.delete(event.data.id);
        entry.resolve(event.data);
      };
      this.#worker.onerror = (event) => {
        for (const [, entry] of this.#pending) {
          entry.reject(new Error(event.message || "O worker falhou."));
        }
        this.#pending.clear();
      };
    }
    return this.#worker;
  }

  #send(request: WithoutId<WorkerRequest>, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const worker = this.#ensureWorker();
    const id = this.#nextId++;

    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      worker.postMessage({ ...request, id } as WorkerRequest, transfer);
    });
  }

  async compress(
    format: FormatId,
    level: number,
    files: { name: string; data: ArrayBuffer }[],
  ): Promise<Uint8Array> {
    // Os buffers também pertencem ao estado da tela. Transferi-los para o
    // worker os desconectaria daqui e impediria repetir a compactação ou
    // mudar o nível sem selecionar os arquivos de novo.
    const response = await this.#send({ kind: "compress", format, level, files });
    if (!response.ok) throw new Error(response.error);
    if (response.kind !== "compress") throw new Error("Resposta inesperada do worker.");
    return new Uint8Array(response.data);
  }

  async inspect(data: ArrayBuffer, fileName?: string): Promise<Archive> {
    // O buffer não é transferido: a extração seguinte precisa dele de volta.
    const response = await this.#send({ kind: "inspect", data, fileName });
    if (!response.ok) throw new Error(response.error);
    if (response.kind !== "inspect") throw new Error("Resposta inesperada do worker.");
    return response.archive;
  }

  async extract(data: ArrayBuffer, archive: Archive, entryName?: string): Promise<Uint8Array> {
    const response = await this.#send({ kind: "extract", data, archive, entryName });
    if (!response.ok) throw new Error(response.error);
    if (response.kind !== "extract") throw new Error("Resposta inesperada do worker.");
    return new Uint8Array(response.data);
  }

  /**
   * Encerra o worker. Toda operação em curso é abandonada e a memória do
   * módulo WASM e dos buffers vai embora com ele.
   */
  terminate(): void {
    this.#worker?.terminate();
    this.#worker = undefined;
    for (const [, entry] of this.#pending) {
      entry.reject(new Error("Operação cancelada."));
    }
    this.#pending.clear();
  }
}
