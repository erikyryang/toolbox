"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { OperationLoadController } from "./loading.ts";
import { loadOperation } from "./registry.ts";

/**
 * Liga a tela ao carregamento do motor.
 *
 * O controlador é criado uma vez por montagem e lido por
 * `useSyncExternalStore` — o mesmo snapshot serve ao servidor, onde o estado é
 * sempre "carregando": a primeira pintura sai com título, controles e campo de
 * entrada prontos, sem depender de nenhum chunk de motor.
 */
export function useOperationLoader(slug: string) {
  const [controller] = useState(() => new OperationLoadController(loadOperation));
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    void controller.load(slug);
    return () => controller.dispose();
  }, [controller, slug]);

  const retry = useCallback(() => {
    void controller.load(slug);
  }, [controller, slug]);

  // O efeito só roda depois da pintura: sem esta guarda, quem trocasse de slug
  // sem remontar o componente veria, por um quadro, o motor da rota anterior
  // declarado pronto para a rota nova.
  const current =
    state.status === "ready" && state.operation.slug !== slug
      ? ({ status: "loading" } as const)
      : state;

  return { state: current, retry };
}
