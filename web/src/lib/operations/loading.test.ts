import { describe, expect, it, vi } from "vitest";
import {
  operationMetaBySlug,
  operationSlugs,
  operationsByGroup,
} from "./catalog.ts";
import { OperationLoadController } from "./loading.ts";
import { createOperationLoader, implementedSlugs, loadOperation } from "./registry.ts";
import { runOperation } from "./run.ts";
import { defaultOptionValues, type Operation } from "./types.ts";

/**
 * Carregar motor é a única parte da tela que é assíncrona e pode falhar. O que
 * se verifica aqui é o que o tempo faz com ela: o pedido que se repete, o que
 * falha, o que é retomado e o que volta tarde demais para a rota que o pediu.
 *
 * Os carregadores são falsos e controlados à mão — um `import()` real resolve
 * rápido demais para deixar ver a janela em que essas coisas acontecem.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** Motor de mentira que assina o resultado, para se saber de quem ele veio. */
function operation(slug: string): Operation {
  return {
    ...operationMetaBySlug(slug)!,
    engines: { forward: (input) => `${slug}:${input}` },
  };
}

describe("registro sob demanda", () => {
  it("pede só a família escolhida e divide o pedido pendente e o resolvido", async () => {
    const pending = deferred<Operation["engines"]>();
    const base64 = vi.fn(() => pending.promise);
    const xml = vi.fn(async () => operation("xml-format").engines);
    const load = createOperationLoader({ base64, "xml-format": xml });

    expect(base64).not.toHaveBeenCalled();
    const first = load("base64");
    expect(load("base64")).toBe(first);

    pending.resolve(operation("base64").engines);
    const resolved = await first;
    expect(await load("base64")).toBe(resolved);
    expect(base64).toHaveBeenCalledTimes(1);
    expect(xml).not.toHaveBeenCalled();

    expect(await load("missing")).toBeUndefined();
    expect(await load("toString")).toBeUndefined();
  });

  it("percorrer catálogo, menu e slugs não inicia carregamento nenhum", () => {
    const spies = Object.fromEntries(
      implementedSlugs().map((slug) => [
        slug,
        vi.fn(async () => operation(slug).engines),
      ]),
    );
    createOperationLoader(spies);

    // O caminho da home, do menu e dos metadados: só leitura de dados.
    operationsByGroup();
    operationSlugs();
    for (const slug of implementedSlugs()) operationMetaBySlug(slug);

    for (const [slug, spy] of Object.entries(spies)) {
      expect(spy, `motor carregado sem tela: ${slug}`).not.toHaveBeenCalled();
    }
  });

  it("resolve duas famílias ao mesmo tempo sem uma vazar na outra", async () => {
    const base64 = deferred<Operation["engines"]>();
    const xml = deferred<Operation["engines"]>();
    const load = createOperationLoader({
      base64: () => base64.promise,
      "xml-format": () => xml.promise,
    });

    const first = load("base64");
    const second = load("xml-format");

    // A ordem de chegada é trocada de propósito: quem termina antes não herda
    // o slug de quem pediu primeiro.
    xml.resolve(operation("xml-format").engines);
    base64.resolve(operation("base64").engines);

    expect((await first)?.slug).toBe("base64");
    expect((await second)?.slug).toBe("xml-format");
    expect((await first)?.engines.forward("t", {})).toBe("base64:t");
    expect((await second)?.engines.forward("t", {})).toBe("xml-format:t");
  });

  it("descarta o pedido que falhou, inclusive quando a falha é síncrona", async () => {
    const loader = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("chunk indisponível");
      })
      .mockResolvedValue(operation("base64").engines);
    const load = createOperationLoader({ base64: loader });

    await expect(load("base64")).rejects.toThrow("chunk indisponível");
    expect((await load("base64"))?.slug).toBe("base64");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("quem falhou junto tenta de novo junto, numa única nova tentativa", async () => {
    const failure = deferred<Operation["engines"]>();
    const recovery = deferred<Operation["engines"]>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(failure.promise)
      .mockReturnValueOnce(recovery.promise);
    const load = createOperationLoader({ base64: loader });

    const first = load("base64");
    const second = load("base64");
    failure.reject(new Error("rede caiu"));
    await expect(first).rejects.toThrow("rede caiu");
    await expect(second).rejects.toThrow("rede caiu");
    expect(loader).toHaveBeenCalledTimes(1);

    const retry = load("base64");
    const alongside = load("base64");
    recovery.resolve(operation("base64").engines);
    expect((await retry)?.slug).toBe("base64");
    expect(await alongside).toBe(await retry);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("mantém a saída de referência nos dois sentidos depois de carregar", async () => {
    const loaded = (await loadOperation("base64"))!;
    const options = defaultOptionValues(loaded);

    expect(runOperation(loaded, "forward", "toolbox", options)).toMatchObject({
      ok: true,
      output: "dG9vbGJveA==",
    });
    expect(runOperation(loaded, "reverse", "dG9vbGJveA==", options)).toMatchObject({
      ok: true,
      output: "toolbox",
    });
  });
});

describe("ciclo de vida do carregamento", () => {
  it.each(["resolve", "reject"] as const)(
    "ignora o %s de uma rota que já foi deixada para trás",
    async (completion) => {
      const first = deferred<Operation>();
      const second = deferred<Operation>();
      const controller = new OperationLoadController(
        vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
      );

      const old = controller.load("base64");
      const current = controller.load("xml-format");
      if (completion === "resolve") first.resolve(operation("base64"));
      else first.reject(new Error("falha vencida"));
      await old;

      expect(controller.getSnapshot()).toEqual({ status: "loading" });

      second.resolve(operation("xml-format"));
      await current;
      expect(controller.getSnapshot()).toMatchObject({
        status: "ready",
        operation: { slug: "xml-format" },
      });
    },
  );

  it("invalida o pedido de quem desmontou e deixa o Strict Mode montar de novo", async () => {
    const pending = deferred<Operation>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(operation("base64"));
    const controller = new OperationLoadController(loader);

    const running = controller.load("base64");
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.dispose();
    pending.resolve(operation("base64"));
    await running;

    expect(listener).not.toHaveBeenCalled();
    await controller.load("base64");
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("se recupera na nova tentativa e processa o que foi digitado durante ela", async () => {
    const pending = deferred<Operation>();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("rede"))
      .mockReturnValueOnce(pending.promise);
    const controller = new OperationLoadController(loader);

    await controller.load("base64");
    expect(controller.getSnapshot().status).toBe("error");

    let input = "antes";
    const retry = controller.load("base64");
    expect(controller.getSnapshot().status).toBe("loading");
    input = "digitado durante a tentativa";
    pending.resolve(operation("base64"));
    await retry;

    const state = controller.getSnapshot();
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(runOperation(state.operation, "forward", input, {})).toMatchObject({
        output: "base64:digitado durante a tentativa",
      });
    }
  });

  it("não expõe motor ausente nem motor de outra operação", async () => {
    const controller = new OperationLoadController(async () => operation("xml-format"));
    await controller.load("base64");
    expect(controller.getSnapshot().status).toBe("error");
  });
});
