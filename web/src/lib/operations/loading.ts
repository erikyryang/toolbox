import type { Operation } from "./types.ts";

export type OperationLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; operation: Operation };

/**
 * O dono do carregamento do motor de uma tela.
 *
 * Fica fora do React de propósito: o que a tela precisa saber é só em qual dos
 * três estados ela está, e a entrada e as opções continuam sendo estado dela,
 * intocados por uma ida à rede que pode falhar ou demorar.
 *
 * Cada pedido carrega uma geração. Quem volta de uma geração vencida — porque
 * a rota mudou ou a tela desmontou — é descartado em silêncio, e é isso que
 * impede o motor de uma rota anterior de aparecer publicando resultado na
 * operação que está na frente do usuário agora.
 */
export class OperationLoadController {
  #state: OperationLoadState = { status: "loading" };
  #generation = 0;
  #listeners = new Set<() => void>();

  constructor(private loader: (slug: string) => Promise<Operation | undefined>) {}

  getSnapshot = () => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #publish(state: OperationLoadState) {
    this.#state = state;
    for (const listener of this.#listeners) listener();
  }

  async load(slug: string) {
    const generation = ++this.#generation;
    this.#publish({ status: "loading" });

    try {
      const operation = await this.loader(slug);
      if (generation !== this.#generation) return;
      // Slug sem motor e motor de outro slug dão no mesmo: não há o que rodar
      // nesta tela, e o caminho honesto é o estado de falha, com nova tentativa.
      if (!operation || operation.slug !== slug) {
        throw new Error(`Operação sem motor carregável: ${slug}`);
      }
      this.#publish({ status: "ready", operation });
    } catch {
      if (generation === this.#generation) this.#publish({ status: "error" });
    }
  }

  /** Vence a geração corrente: o que estiver voando volta para ninguém. */
  dispose = () => {
    this.#generation++;
  };
}
