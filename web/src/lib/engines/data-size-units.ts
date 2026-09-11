/**
 * O vocabulário de unidades de tamanho de dados: a escada e os nomes dela.
 *
 * É a mesma lista que o motor usa para converter e que o catálogo usa para
 * montar os dois seletores — e é por ser a mesma que acrescentar um degrau
 * aparece nos dois lugares, sem uma segunda lista para sair de sincronia.
 *
 * Ela mora fora do motor porque o catálogo é estático e o motor é carregado
 * sob demanda: enquanto os nomes viviam junto da aritmética, pedir o catálogo
 * trazia o conversor inteiro para o pacote inicial de toda rota, inclusive das
 * que nunca convertem tamanho nenhum.
 */

export const DATA_UNITS = ["bit", "byte", "kb", "mb", "gb", "tb"] as const;

export type DataUnit = (typeof DATA_UNITS)[number];

export const UNIT_LABELS: Record<DataUnit, string> = {
  bit: "bit",
  byte: "byte",
  kb: "KB",
  mb: "MB",
  gb: "GB",
  tb: "TB",
};
