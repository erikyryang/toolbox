"use client";

import { useEffect, useState } from "react";

/**
 * Atrasa a propagação de um valor. A conversão é em tempo real, mas recalcular
 * a cada tecla desperdiça trabalho — 120 ms é curto o bastante para a saída
 * parecer instantânea e longo o bastante para agrupar uma rajada de digitação.
 */
export function useDebounced<T>(value: T, delayMs = 120): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
