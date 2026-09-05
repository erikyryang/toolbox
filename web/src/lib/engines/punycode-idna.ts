// "punycode/" com a barra final resolve o pacote do npm em vez do módulo
// embutido e depreciado do Node — o do npm é o que também roda no navegador.
import punycode from "punycode/";

import { OperationError } from "./errors.ts";

/**
 * Conversão IDNA entre Unicode e Punycode, rótulo a rótulo.
 *
 * `toASCII` e `toUnicode` já operam sobre o domínio inteiro preservando os
 * separadores; a validação aqui existe para dar mensagem legível no lugar do
 * silêncio (a biblioteca devolve a entrada intacta quando não há o que fazer).
 */

export function toPunycode(input: string): string {
  const domain = input.trim();
  if (domain === "") return "";

  if (/\s/.test(domain)) {
    throw new OperationError(
      "Um nome de domínio não contém espaços. Converta um domínio por vez.",
      domain.search(/\s/),
    );
  }

  return punycode.toASCII(domain);
}

export function fromPunycode(input: string): string {
  const domain = input.trim();
  if (domain === "") return "";

  if (/\s/.test(domain)) {
    throw new OperationError(
      "Um nome de domínio não contém espaços. Converta um domínio por vez.",
      domain.search(/\s/),
    );
  }

  try {
    return punycode.toUnicode(domain);
  } catch (error) {
    throw new OperationError(
      `Rótulo Punycode inválido: ${error instanceof Error ? error.message : "não foi possível decodificar"}.`,
    );
  }
}
