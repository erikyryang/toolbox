import { isOperationError } from "../engines/errors.ts";
import { feedbackOf } from "../messages.ts";
import {
  engineOf,
  normalizeResult,
  type Direction,
  type Operation,
  type OperationOutcome,
  type OptionValues,
} from "./types.ts";

/**
 * Executa uma operação e devolve sempre um resultado — nunca lança.
 *
 * O campo `processedOn` do resultado é a única fonte da verdade sobre onde a
 * operação rodou: é o mesmo objeto que alimenta o aviso de privacidade, de
 * modo que a interface não tem como afirmar algo diferente do que aconteceu.
 */
export function runOperation(
  operation: Operation,
  direction: Direction,
  input: string,
  options: OptionValues,
): OperationOutcome {
  if (input === "") {
    return { ok: true, output: "", processedOn: "client", notes: [] };
  }

  try {
    const { output, notes } = normalizeResult(
      engineOf(operation, direction)(input, options),
    );
    return { ok: true, output, processedOn: "client", notes };
  } catch (error) {
    return {
      ok: false,
      feedback: feedbackOf(error),
      position: isOperationError(error) ? error.position : undefined,
      processedOn: "client",
    };
  }
}
