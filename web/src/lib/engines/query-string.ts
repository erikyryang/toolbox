import type { EngineResult, OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Query string ⇄ estrutura.
 *
 * Chaves repetidas são a razão de este motor existir: `a=1&b=2&a=3` não é um
 * objeto, e transformá-lo em um perderia o segundo `a`. A representação
 * estruturada é uma lista de pares, que sobrevive à ida e à volta.
 */

type Pair = { key: string; value: string };

function parsePairs(input: string): Pair[] {
  const query = input.trim().replace(/^[?#]/, "");
  if (query === "") return [];

  return query
    .split("&")
    .filter((chunk) => chunk !== "")
    .map((chunk) => {
      const separator = chunk.indexOf("=");
      const rawKey = separator === -1 ? chunk : chunk.slice(0, separator);
      const rawValue = separator === -1 ? "" : chunk.slice(separator + 1);

      try {
        return {
          key: decodeURIComponent(rawKey.replace(/\+/g, " ")),
          value: decodeURIComponent(rawValue.replace(/\+/g, " ")),
        };
      } catch {
        throw new OperationError(
          `O par "${chunk}" contém percent-encoding inválido.`,
          input.indexOf(chunk),
        );
      }
    });
}

export function queryToStructure(input: string, options: OptionValues): EngineResult {
  const pairs = parsePairs(input);
  if (pairs.length === 0) return "";

  const sorted =
    options.sort === true
      ? [...pairs].sort((a, b) => a.key.localeCompare(b.key))
      : pairs;

  const seen = new Map<string, number>();
  for (const pair of sorted) {
    seen.set(pair.key, (seen.get(pair.key) ?? 0) + 1);
  }
  const repeated = [...seen.entries()].filter(([, count]) => count > 1);

  const notes = repeated.map(
    ([key, count]) =>
      `A chave "${key}" aparece ${count} vezes; todos os valores foram preservados.`,
  );

  const indent = options.indent === "tab" ? "\t" : 2;

  return {
    output: JSON.stringify(
      sorted.map(({ key, value }) => [key, value]),
      null,
      indent,
    ),
    notes,
  };
}

export function structureToQuery(input: string, options: OptionValues): EngineResult {
  if (input.trim() === "") return "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new OperationError(
      `A estrutura precisa ser JSON válido: ${error instanceof Error ? error.message : "erro de parsing"}.`,
    );
  }

  const pairs: Pair[] = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string"
      ) {
        throw new OperationError(
          'Cada item precisa ser um par ["chave", "valor"].',
        );
      }
      pairs.push({ key: entry[0], value: String(entry[1] ?? "") });
    }
  } else if (parsed && typeof parsed === "object") {
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          pairs.push({ key, value: String(item ?? "") });
        }
      } else {
        pairs.push({ key, value: String(value ?? "") });
      }
    }
  } else {
    throw new OperationError(
      "A entrada precisa ser um objeto ou uma lista de pares em JSON.",
    );
  }

  const ordered =
    options.sort === true
      ? [...pairs].sort((a, b) => a.key.localeCompare(b.key))
      : pairs;

  return ordered
    .map(
      ({ key, value }) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}
