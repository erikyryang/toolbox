import { operationMetaBySlug } from "./catalog.ts";
import type { Operation } from "./types.ts";

export type EngineLoader = () => Promise<Operation["engines"]>;

/**
 * Um `import()` por família de motor. O catálogo descreve a operação; aqui ela
 * ganha execução — só que agora sob demanda.
 *
 * Os caminhos são literais, escritos um a um, porque é disso que o empacotador
 * precisa para dar um chunk próprio a cada família. Um caminho montado em
 * tempo de execução obrigaria a empacotar todos os candidatos juntos, que é
 * exatamente o que esta separação existe para evitar.
 */
const loaders: Record<string, EngineLoader> = {
  base64: () =>
    import("../engines/base64.ts").then((engine) => ({
      forward: engine.encodeBase64,
      reverse: engine.decodeBase64,
    })),

  base32: () =>
    import("../engines/base32-58.ts").then((engine) => ({
      forward: engine.encodeBase32,
      reverse: engine.decodeBase32,
    })),

  base58: () =>
    import("../engines/base32-58.ts").then((engine) => ({
      forward: engine.encodeBase58,
      reverse: engine.decodeBase58,
    })),

  "json-format": () =>
    import("../engines/structured.ts").then((engine) => ({
      forward: engine.formatter("json", false),
      reverse: engine.formatter("json", true),
    })),

  "xml-format": () =>
    import("../engines/structured.ts").then((engine) => ({
      forward: engine.formatter("xml", false),
      reverse: engine.formatter("xml", true),
    })),

  // Sentido único: o inverso seria outra operação, não a volta desta.
  "juntar-linhas": () =>
    import("../engines/lines.ts").then((engine) => ({
      forward: engine.joinLines,
    })),

  // O inverso é o mesmo motor com origem e destino trocados.
  "converter-tamanho": () =>
    import("../engines/data-size.ts").then((engine) => ({
      forward: engine.convertDataSize,
      reverse: engine.convertDataSizeBack,
    })),
};

/**
 * Resolve o descritor completo de um slug — metadados mais motores.
 *
 * A mesma Promise é devolvida a quem pedir o mesmo slug, pendente ou já
 * resolvida: duas montagens da mesma tela não devem baixar o mesmo chunk duas
 * vezes. A rejeição, ao contrário, sai do cache — uma falha de rede guardada
 * deixaria a operação quebrada até o reload, e o botão de tentar novamente não
 * teria o que tentar.
 *
 * O registro é um objeto comum, então a consulta passa por `Object.hasOwn`:
 * sem isso um slug como `toString` acharia motor no protótipo.
 */
export function createOperationLoader(registry: Record<string, EngineLoader>) {
  const cache = new Map<string, Promise<Operation | undefined>>();

  return function load(slug: string): Promise<Operation | undefined> {
    const meta = operationMetaBySlug(slug);
    const loader = Object.hasOwn(registry, slug) ? registry[slug] : undefined;
    if (!meta || !loader) return Promise.resolve(undefined);

    const cached = cache.get(slug);
    if (cached) return cached;

    // O carregador é chamado dentro da cadeia para que uma falha síncrona —
    // um chunk que nem chega a virar Promise — termine como rejeição também.
    const request = Promise.resolve()
      .then(loader)
      .then((engines) => ({ ...meta, engines }))
      .catch((error: unknown) => {
        cache.delete(slug);
        throw error;
      });

    cache.set(slug, request);
    return request;
  };
}

export const loadOperation = createOperationLoader(loaders);

/**
 * Slugs que têm motor — usado pelos testes para garantir catálogo e motores em
 * dia. Listar não inicia carregamento nenhum: são as chaves, não as funções.
 */
export function implementedSlugs(): string[] {
  return Object.keys(loaders);
}
