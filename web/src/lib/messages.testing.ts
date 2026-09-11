import { feedbackOf, type Feedback } from "./messages.ts";

/**
 * O feedback que uma execução falha reporta.
 *
 * Testes olham o código e os parâmetros, nunca a frase: a frase é escolha do
 * catálogo e muda com o idioma de quem lê.
 */
export function feedbackFrom(run: () => unknown): Feedback {
  try {
    run();
  } catch (error) {
    return feedbackOf(error);
  }
  throw new Error("a execução não falhou");
}

export async function feedbackFromRejection(promise: Promise<unknown>): Promise<Feedback> {
  try {
    await promise;
  } catch (error) {
    return feedbackOf(error);
  }
  throw new Error("a promessa não foi rejeitada");
}
