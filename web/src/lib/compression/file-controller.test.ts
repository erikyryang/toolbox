import { describe, expect, it, vi } from "vitest";
import type { Archive } from "./codecs";
import { DETECTION_PREFIX_BYTES, FileOperationController, type FileOperationDependencies, type SelectedFile } from "./file-controller";
import { CLIENT_MAX_BYTES, ZSTD_CLIENT_MAX_LEVEL } from "./limits";
import { OperationError } from "../engines/errors";
import { localizeFeedback } from "../messages";
import { failure } from "./backend";

const archive: Archive = { format: "zip", single: false, entries: [{ name: "a.txt", size: 1, directory: false }] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const local = { inspect: vi.fn(async (): Promise<Archive> => archive), compress: vi.fn(async (): Promise<Uint8Array> => new Uint8Array([1])), extract: vi.fn(async (): Promise<Uint8Array> => new Uint8Array([2])), terminate: vi.fn() };
  const dependencies = {
    createClient: vi.fn(() => local), backendAvailable: vi.fn(() => true),
    inspectOnServer: vi.fn<FileOperationDependencies["inspectOnServer"]>(async () => archive),
    compressOnServer: vi.fn<FileOperationDependencies["compressOnServer"]>(async () => new Uint8Array([3])),
    extractOnServer: vi.fn<FileOperationDependencies["extractOnServer"]>(async () => new Uint8Array([4])),
  };
  return { controller: new FileOperationController(dependencies), local, dependencies };
}
function selected(size = 4, name = "a.zip"): SelectedFile {
  const blob = new Blob([new Uint8Array([0x50, 0x4b, 3, 4])]);
  vi.spyOn(blob, "arrayBuffer");
  vi.spyOn(blob, "slice");
  return { name, blob, size };
}

describe("file operation lifecycle", () => {
  it("reads only the signature and sends original Blob for server inspection and extraction", async () => {
    const { controller, dependencies, local } = fixture();
    const file = selected(CLIENT_MAX_BYTES + 1);
    await controller.select([file], true);
    expect(file.blob.slice).toHaveBeenCalledWith(0, DETECTION_PREFIX_BYTES);
    expect(DETECTION_PREFIX_BYTES).toBeLessThanOrEqual(512);
    expect(file.blob.arrayBuffer).not.toHaveBeenCalled();
    expect(dependencies.inspectOnServer).toHaveBeenCalledWith(file.blob, expect.any(AbortSignal));
    await controller.extract("a.txt");
    expect(dependencies.extractOnServer).toHaveBeenCalledWith(file.blob, "a.txt", expect.any(AbortSignal));
    expect(file.blob.arrayBuffer).not.toHaveBeenCalled();
    expect(local.inspect).not.toHaveBeenCalled();
  });

  it("defers full reads until a local compression runs and supports repeating it", async () => {
    const { controller, local } = fixture();
    const file = selected();
    await controller.select([file], false);
    expect(file.blob.arrayBuffer).not.toHaveBeenCalled();
    await controller.compress("zip", "balanced", 6);
    await controller.compress("zip", "balanced", 6);
    expect(file.blob.arrayBuffer).toHaveBeenCalledTimes(2);
    expect(local.compress).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().result?.name).toBe("a.zip.zip");
  });

  it("routes by level before materializing compression input", async () => {
    const { controller, dependencies } = fixture();
    const file = selected();
    await controller.select([file], false);
    const level = ZSTD_CLIENT_MAX_LEVEL + 1;
    await controller.compress("zstd", "custom", level);
    expect(dependencies.compressOnServer).toHaveBeenCalledWith("zstd", "custom", level, [{ name: file.name, data: file.blob }], expect.any(AbortSignal));
    expect(file.blob.arrayBuffer).not.toHaveBeenCalled();
  });

  it("does not start local work after reset while the full read is pending", async () => {
    const { controller, local } = fixture();
    const file = selected();
    const read = deferred<ArrayBuffer>();
    vi.mocked(file.blob.arrayBuffer).mockReturnValue(read.promise);
    await controller.select([file], false);
    const running = controller.compress("zip", "balanced", 6);
    controller.reset();
    read.resolve(new ArrayBuffer(4));
    await running;
    expect(local.compress).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toEqual({ files: [], busy: false, archive: undefined, detectedFormat: undefined, result: undefined, feedback: undefined });
  });

  it.each(["resolve", "reject"] as const)("reset aborts HTTP and ignores a late %s", async (completion) => {
    const { controller, dependencies } = fixture();
    const pending = deferred<Uint8Array>();
    dependencies.compressOnServer.mockReturnValue(pending.promise);
    await controller.select([selected(CLIENT_MAX_BYTES + 1)], false);
    const running = controller.compress("zip", "balanced", 6);
    const signal = dependencies.compressOnServer.mock.calls[0][4];
    controller.reset();
    expect(signal.aborted).toBe(true);
    if (completion === "resolve") pending.resolve(new Uint8Array([9]));
    else pending.reject(new Error("late failure"));
    await running;
    expect(controller.getSnapshot()).toMatchObject({ files: [], busy: false, result: undefined, feedback: undefined });
  });

  it("selection replacement prevents an older prefix read from publishing", async () => {
    const { controller, dependencies } = fixture();
    const first = selected(CLIENT_MAX_BYTES + 1, "old.zip");
    const read = deferred<ArrayBuffer>();
    vi.mocked(first.blob.slice).mockReturnValue({ arrayBuffer: () => read.promise } as Blob);
    const pending = controller.select([first], true);
    const second = selected(CLIENT_MAX_BYTES + 1, "new.zip");
    await controller.select([second], true);
    read.resolve(new Uint8Array([0x1f, 0x8b]).buffer);
    await pending;
    expect(controller.getSnapshot()).toMatchObject({ files: [second], detectedFormat: "zip", archive, busy: false });
    expect(dependencies.inspectOnServer).toHaveBeenCalledTimes(1);
  });

  it("an old inspection cannot clear the busy state of the next selection", async () => {
    const { controller, dependencies } = fixture();
    const old = deferred<Archive>();
    const next = deferred<Archive>();
    dependencies.inspectOnServer.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const first = controller.select([selected(CLIENT_MAX_BYTES + 1)], true, "zip");
    const second = controller.select([selected(CLIENT_MAX_BYTES + 1, "new.zip")], true, "zip");
    expect(dependencies.inspectOnServer.mock.calls[0][1].aborted).toBe(true);
    old.resolve(archive);
    await first;
    expect(controller.getSnapshot().busy).toBe(true);
    expect(controller.getSnapshot().archive).toBeUndefined();
    next.resolve(archive);
    await second;
    expect(controller.getSnapshot().busy).toBe(false);
  });

  it("dispose cancels transport without notifying unmounted subscribers", async () => {
    const { controller, dependencies } = fixture();
    const pending = deferred<Archive>();
    dependencies.inspectOnServer.mockReturnValue(pending.promise);
    const running = controller.select([selected(CLIENT_MAX_BYTES + 1)], true, "zip");
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.dispose();
    expect(dependencies.inspectOnServer.mock.calls[0][1].aborted).toBe(true);
    pending.resolve(archive);
    await running;
    expect(listener).not.toHaveBeenCalled();
  });

  it("terminates a pending worker and ignores its late rejection", async () => {
    const { controller, local } = fixture();
    const pending = deferred<Uint8Array>();
    local.compress.mockReturnValue(pending.promise);
    await controller.select([selected()], false);
    const running = controller.compress("zip", "balanced", 6);
    await vi.waitFor(() => expect(local.compress).toHaveBeenCalled());
    controller.configure();
    expect(local.terminate).toHaveBeenCalled();
    pending.reject(new Error("cancelled"));
    await running;
    expect(controller.getSnapshot()).toMatchObject({ busy: false, result: undefined, feedback: undefined });
  });
});

describe("file feedback survives language changes", () => {
  it("preserves a local error's code, parameters and position without reading its sentence", async () => {
    const { controller, local } = fixture();
    local.inspect.mockRejectedValue(new OperationError({ code: "error.zipHeader", params: { offset: 42 }, position: 42 }));
    const file = selected();
    await controller.select([file], true);
    const snapshot = controller.getSnapshot();
    expect(snapshot.feedback).toEqual({ code: "error.zipHeader", params: { offset: 42 }, position: 42 });
    expect(localizeFeedback(snapshot.feedback, "en")).toContain("Invalid ZIP entry header at offset 42");
    expect(localizeFeedback(snapshot.feedback, "pt")).toContain("Cabeçalho de entrada ZIP inválido no deslocamento 42");
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(snapshot.files[0].blob).toBe(file.blob);
    expect(local.inspect).toHaveBeenCalledTimes(1);
    controller.configure();
    expect(controller.getSnapshot().feedback).toBeUndefined();
  });

  it.each([413, 429, 503])("keeps HTTP %s and Retry-After in state for either language", async (status) => {
    const { controller, dependencies } = fixture();
    dependencies.compressOnServer.mockRejectedValue(failure(new Response("private remote detail", { status, headers: { "Retry-After": "30" } })));
    const file = selected(CLIENT_MAX_BYTES + 1);
    await controller.select([file], false);
    await controller.compress("zip", "balanced", 6);
    const feedback = controller.getSnapshot().feedback;
    expect(feedback?.params).toEqual({ status, retryAfter: "30" });
    expect(localizeFeedback(feedback, "en")).toContain("in 30 seconds");
    expect(localizeFeedback(feedback, "pt")).toContain("em 30 segundos");
    expect(localizeFeedback(feedback, "en")).not.toContain("private");
    expect(file.blob.arrayBuffer).not.toHaveBeenCalled();
  });

  it("localizes an unavailable backend and an unknown error using stable codes", async () => {
    const { controller, dependencies } = fixture();
    dependencies.backendAvailable.mockReturnValue(false);
    await controller.select([selected(CLIENT_MAX_BYTES + 1)], true, "zip");
    expect(controller.getSnapshot().feedback?.code).toBe("error.backendUnavailable");
    expect(localizeFeedback(controller.getSnapshot().feedback, "pt")).toContain("não está disponível");
    dependencies.backendAvailable.mockReturnValue(true);
    dependencies.inspectOnServer.mockRejectedValue(new Error("sensitive server detail"));
    await controller.select([selected(CLIENT_MAX_BYTES + 1)], true, "zip");
    expect(controller.getSnapshot().feedback?.code).toBe("error.unknown");
    expect(localizeFeedback(controller.getSnapshot().feedback, "en")).not.toContain("sensitive");
  });
});
