/**
 * Filtro de um campo estritamente numérico.
 *
 * A recusa acontece na digitação, e não depois por mensagem de erro: quem
 * digita uma letra num campo de valor não cometeu um engano que mereça
 * repreensão, apenas errou a tecla. O caractere não entra, e pronto.
 *
 * Função pura, fora do componente, para poder ser testada sem renderizar —
 * e porque a regra do que é um número em digitação tem mais casos de borda do
 * que parece.
 */

/**
 * Mantém só o que pode fazer parte de um número: dígitos, um separador
 * decimal e um sinal no começo.
 *
 * Vírgula é preservada como vírgula, e não normalizada para ponto: quem
 * digita em português vê o que digitou, e o motor aceita as duas formas. Um
 * segundo separador é descartado, assim como um sinal fora da primeira
 * posição — nos dois casos, a tecla simplesmente não produz nada.
 */
export function sanitizeNumeric(raw: string): string {
  let result = "";
  let hasSeparator = false;

  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }

    if ((char === "." || char === ",") && !hasSeparator) {
      hasSeparator = true;
      result += char;
      continue;
    }

    if ((char === "-" || char === "+") && result === "") {
      result += char;
    }
  }

  return result;
}
