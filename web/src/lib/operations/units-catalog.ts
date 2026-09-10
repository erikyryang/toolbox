import { DATA_UNITS, UNIT_LABELS } from "../engines/data-size.ts";
import type { OperationMeta, OptionSpec } from "./types.ts";

/**
 * Entradas de catálogo do grupo Unidades.
 *
 * As escolhas de unidade são derivadas da escada do motor, e não redigitadas:
 * acrescentar um degrau lá o faz aparecer nos dois seletores aqui, sem que
 * exista uma segunda lista para sair de sincronia.
 */

function unitChoices() {
  return DATA_UNITS.map((unit) => ({ value: unit, label: UNIT_LABELS[unit] }));
}

const FROM_OPTION: OptionSpec = {
  kind: "select",
  id: "from",
  label: "De",
  help: "Uma unidade escrita junto do valor — 1.5 GB — vence esta escolha.",
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
  slug: "tamanho-de-dados",
  name: "Tamanho de dados",
  title: "Tamanho de dados",
  subtitle:
    "Converte entre bit, byte, KB, MB, GB e TB, com a base escolhida por você em vez de adivinhada.",
  description:
    "Conversor de unidades de tamanho de dados entre bit, byte, KB, MB, GB e TB, com escolha explícita entre base 1000 (SI) e 1024 (IEC), processado no seu navegador.",
  group: "Unidades",
  execution: "client",
  placeholder: "1.5 GB\n512\n2 TiB",
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
  options: [BASE_OPTION, FROM_OPTION, TO_OPTION],
  // As três são a operação, não um ajuste fino dela: um conversor cuja base
  // está escondida esconde a própria pergunta que ele responde.
  primaryOptionIds: ["base", "from", "to"],
};

export const unitOperations: OperationMeta[] = [dataSizeOperation];
