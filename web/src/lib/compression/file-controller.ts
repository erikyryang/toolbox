import type { Archive } from "./codecs";
import type { FormatId } from "./formats";
import { FORMATS } from "./formats";
import { detectFormat } from "./detect";
import { decideRouting, type RoutingDecision } from "./limits";

export type SelectedFile = { name: string; size: number; blob: Blob };
export type FileResult = { name: string; bytes: Uint8Array };
export type FileOperationState = {
  files: SelectedFile[];
  archive?: Archive;
  detectedFormat?: FormatId;
  result?: FileResult;
  error?: string;
  busy: boolean;
};

type LocalClient = {
  inspect(data: ArrayBuffer, name?: string): Promise<Archive>;
  compress(format: FormatId, level: number, files: { name: string; data: ArrayBuffer }[]): Promise<Uint8Array>;
  extract(data: ArrayBuffer, archive: Archive, entryName?: string): Promise<Uint8Array>;
  terminate(): void;
};

export type FileOperationDependencies = {
  createClient(): LocalClient;
  backendAvailable(): boolean;
  inspectOnServer(data: Blob, signal: AbortSignal): Promise<Archive>;
  compressOnServer(format: FormatId, preset: string, level: number, files: { name: string; data: Blob }[], signal: AbortSignal): Promise<Uint8Array>;
  extractOnServer(data: Blob, entryName: string | undefined, signal: AbortSignal): Promise<Uint8Array>;
};

export type FileOperationMessages = {
  unavailable(decision: RoutingDecision): string;
  read: string;
  compress: string;
  extract: string;
};

// Includes TAR's signature at offset 257 without reading the full file.
export const DETECTION_PREFIX_BYTES = Math.max(
  ...Object.values(FORMATS).flatMap((format) => format.magic.map((magic) => magic.offset + magic.bytes.length)),
);

/** Owns resources and publication; promises from obsolete generations never publish. */
export class FileOperationController {
  #state: FileOperationState = { files: [], busy: false };
  #listeners = new Set<() => void>();
  #generation = 0;
  #abort?: AbortController;
  #client?: LocalClient;

  constructor(private dependencies: FileOperationDependencies) {}

  getSnapshot = (): FileOperationState => this.#state;
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  #publish(patch: Partial<FileOperationState>) {
    this.#state = { ...this.#state, ...patch };
    for (const listener of this.#listeners) listener();
  }

  #invalidate() {
    this.#generation++;
    this.#abort?.abort();
    this.#abort = undefined;
    this.#client?.terminate();
    this.#client = undefined;
  }

  #begin() {
    this.#invalidate();
    const generation = this.#generation;
    const abort = new AbortController();
    this.#abort = abort;
    return { signal: abort.signal, current: () => generation === this.#generation };
  }

  #local() { return this.#client ??= this.dependencies.createClient(); }

  reset = () => {
    this.#invalidate();
    this.#publish({ files: [], archive: undefined, detectedFormat: undefined, result: undefined, error: undefined, busy: false });
  };

  dispose = () => { this.#invalidate(); };

  /** Changing execution options also cancels a running operation. */
  configure(files = this.#state.files) {
    this.#invalidate();
    this.#publish({ files, result: undefined, error: undefined, busy: false });
  }

  async select(files: SelectedFile[], inspect: boolean, messages: FileOperationMessages, knownFormat?: FormatId) {
    const task = this.#begin();
    this.#publish({ files, archive: undefined, detectedFormat: undefined, result: undefined, error: undefined, busy: inspect && files.length > 0 });
    if (!inspect || !files.length) return;
    const file = files[0];
    try {
      const format = knownFormat ?? detectFormat(new Uint8Array(await file.blob.slice(0, DETECTION_PREFIX_BYTES).arrayBuffer()));
      if (!task.current()) return;
      this.#publish({ detectedFormat: format });
      const decision = decideRouting({ format: format ?? "zip", direction: "decompress", sizeBytes: file.size });
      if (decision.where === "server" && !this.dependencies.backendAvailable()) throw new Error(messages.unavailable(decision));
      let archive: Archive;
      if (decision.where === "server") {
        archive = await this.dependencies.inspectOnServer(file.blob, task.signal);
      } else {
        const data = await file.blob.arrayBuffer();
        if (!task.current()) return;
        archive = await this.#local().inspect(data, file.name);
      }
      if (task.current()) this.#publish({ archive });
    } catch (failure) {
      if (task.current()) this.#publish({ error: failure instanceof Error ? failure.message : messages.read });
    } finally {
      if (task.current()) this.#publish({ busy: false });
    }
  }

  async compress(format: FormatId, preset: string, level: number, messages: FileOperationMessages) {
    const files = this.#state.files;
    if (!files.length) return;
    const task = this.#begin();
    this.#publish({ busy: true, error: undefined, result: undefined });
    try {
      const decision = decideRouting({ format, direction: "compress", sizeBytes: files.reduce((sum, file) => sum + file.size, 0), level });
      let bytes: Uint8Array;
      if (decision.where === "server") {
        if (!this.dependencies.backendAvailable()) throw new Error(messages.unavailable(decision));
        bytes = await this.dependencies.compressOnServer(format, preset, level, files.map((file) => ({ name: file.name, data: file.blob })), task.signal);
      } else {
        const payload = await Promise.all(files.map(async (file) => ({ name: file.name, data: await file.blob.arrayBuffer() })));
        if (!task.current()) return;
        bytes = await this.#local().compress(format, level, payload);
      }
      if (task.current()) this.#publish({ result: { name: `${files.length === 1 ? files[0].name : "arquivos"}${FORMATS[format].extension}`, bytes } });
    } catch (failure) {
      if (task.current()) this.#publish({ error: failure instanceof Error ? failure.message : messages.compress });
    } finally {
      if (task.current()) this.#publish({ busy: false });
    }
  }

  async extract(entryName: string | undefined, messages: FileOperationMessages) {
    const { archive, files } = this.#state;
    if (!archive || !files.length) return;
    const task = this.#begin();
    this.#publish({ busy: true, error: undefined, result: undefined });
    try {
      const decision = decideRouting({ format: archive.format, direction: "decompress", sizeBytes: files[0].size });
      let bytes: Uint8Array;
      if (decision.where === "server") {
        if (!this.dependencies.backendAvailable()) throw new Error(messages.unavailable(decision));
        bytes = await this.dependencies.extractOnServer(files[0].blob, entryName, task.signal);
      } else {
        const data = await files[0].blob.arrayBuffer();
        if (!task.current()) return;
        bytes = await this.#local().extract(data, archive, entryName);
      }
      if (task.current()) this.#publish({ result: { name: entryName?.split("/").pop() ?? archive.entries[0]?.name ?? files[0].name, bytes } });
    } catch (failure) {
      if (task.current()) this.#publish({ error: failure instanceof Error ? failure.message : messages.extract });
    } finally {
      if (task.current()) this.#publish({ busy: false });
    }
  }
}
