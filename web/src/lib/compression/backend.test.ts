import { afterEach, describe, expect, it, vi } from "vitest";
import { compressOnServer, extractOnServer, inspectOnServer } from "./backend";

afterEach(() => vi.unstubAllGlobals());

describe("server input transport", () => {
  it.each([new Blob(["payload"]), new TextEncoder().encode("payload").buffer])("sends inspection and extraction bodies without materializing or wrapping them", async (data) => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ format: "zip", single: false, entries: [] }))).mockResolvedValueOnce(new Response("output"));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    await inspectOnServer(data, signal);
    await extractOnServer(data, "folder/a b.txt", signal);
    for (const [, init] of fetch.mock.calls) {
      expect(init.body).toBe(data);
      expect(init).toMatchObject({ signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    }
    expect(fetch.mock.calls[1][0]).toContain("entry=folder%2Fa%20b.txt");
  });

  it("creates multipart files for Blob and legacy ArrayBuffer inputs", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("output"));
    vi.stubGlobal("fetch", fetch);
    const blob = new Blob(["first"]);
    const read = vi.spyOn(blob, "arrayBuffer");
    const signal = new AbortController().signal;
    await compressOnServer("zip", "balanced", 6, [{ name: "a.txt", data: blob }, { name: "b.txt", data: new TextEncoder().encode("second").buffer }], signal);
    expect(read).not.toHaveBeenCalled();
    const init = fetch.mock.calls[0][1];
    expect(init.signal).toBe(signal);
    const files = (init.body as FormData).getAll("file") as File[];
    expect(files.map((file) => file.name)).toEqual(["a.txt", "b.txt"]);
    expect(await Promise.all(files.map((file) => file.text()))).toEqual(["first", "second"]);
  });
});
