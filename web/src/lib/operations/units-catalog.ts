import { DATA_UNITS, UNIT_LABELS } from "../engines/data-size-units.ts";
import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo do grupo Unidades.
 *
 * As escolhas de unidade são derivadas da escada de unidades, e não
 * redigitadas: acrescentar um degrau lá o faz aparecer nos dois seletores
 * aqui, sem que exista uma segunda lista para sair de sincronia. O catálogo lê
 * só o vocabulário — a aritmética do conversor mora no motor, que chega
 * quando a tela dele é aberta, e não junto com o menu.
 */

function unitChoices() {
  return DATA_UNITS.map((unit) => ({ value: unit, label: UNIT_LABELS[unit] }));
}

const FROM_OPTION: OptionSpec = {
  kind: "select",
  id: "from",
  label: "De",
  default: "gb",
  choices: unitChoices(),
};

const TO_OPTION: OptionSpec = {
  kind: "select",
  id: "to",
  label: "Para",
  default: "mb",
  choices: unitChoices(),
};

/**
 * A base é a opção central desta operação, não um detalhe avançado: é ela que
 * explica por que um disco de 1 TB aparece como 931 no sistema operacional.
 * Por isso vem primeiro entre as três e traz a ajuda mais longa.
 */
const BASE_OPTION: OptionSpec = {
  kind: "select",
  id: "base",
  label: "Base",
  help: "1024 é o que o sistema operacional reporta; 1000 é o que o fabricante imprime na caixa.",
  default: "1024",
  choices: [
    { value: "1024", label: "1024 (binária, IEC)" },
    { value: "1000", label: "1000 (decimal, SI)" },
  ],
};

const dataSizeOperation: OperationMeta = {
  slug: "converter-tamanho",
  name: "Converter tamanho",
  title: "Converter tamanho",
  subtitle:
    "Converte entre bit, byte, KB, MB, GB e TB, com a base escolhida por você em vez de adivinhada.",
  description:
    "Conversor de unidades de tamanho de dados entre bit, byte, KB, MB, GB e TB, com escolha explícita entre base 1000 (SI) e 1024 (IEC), processado no seu navegador.",
  group: "Unidades",
  execution: "client",
  placeholder: "1.5",
  aliases: [
    "bit",
    "byte",
    "bytes",
    "kb",
    "mb",
    "gb",
    "tb",
    "kib",
    "mib",
    "gib",
    "tib",
    "tamanho",
    "unidade",
    "unidades",
    "size",
    "data size",
    "converter tamanho",
    "1024",
    "1000",
  ],
  // Os dois sentidos são as mesmas duas unidades, trocadas de ponta. O rótulo
  // diz isso literalmente, porque "Converter" e "Inverter" não diriam de onde
  // para onde — e é justamente essa a pergunta.
  forward: {
    label: "De → Para",
    inputLabel: "Valor",
    outputLabel: "Resultado",
    help: "Converte da unidade escolhida em De para a escolhida em Para.",
  },
  reverse: {
    label: "Para → De",
    inputLabel: "Valor",
    outputLabel: "Resultado",
    help: "O caminho de volta: converte da unidade escolhida em Para para a escolhida em De.",
  },
  // O valor é um número, não um texto: os painéis viram campos de uma linha.
  valueKind: "number",
  options: [BASE_OPTION, FROM_OPTION, TO_OPTION],
  // As três são a operação, não um ajuste fino dela: um conversor cuja base
  // está escondida esconde a própria pergunta que ele responde.
  primaryOptionIds: ["base", "from", "to"],
};

export const unitOperations: OperationMeta[] = [dataSizeOperation];
