/**
 * Modelo de operação.
 *
 * Um motor é uma função pura, sem React e sem DOM: recebe a entrada e as
 * opções, devolve a saída ou lança OperationError. É isso que permite testar
 * cada operação isoladamente e, mais tarde, mover um motor para um Web Worker
 * sem tocar na interface.
 */

export type OptionValue = string | boolean | number;
export type OptionValues = Record<string, OptionValue>;

export type OptionSpec =
  | {
      kind: "select";
      id: string;
      label: string;
      help?: string;
      default: string;
      choices: { value: string; label: string }[];
    }
  | {
      kind: "boolean";
      id: string;
      label: string;
      help?: string;
      default: boolean;
    };

/**
 * Um motor devolve a saída e, quando a conversão perde ou normaliza alguma
 * coisa, os avisos que explicam o quê. Avisos não são erro: a saída é válida,
 * mas o usuário precisa saber o que não sobreviveu à travessia.
 */
export type EngineResult = string | { output: string; notes?: string[] };

export type Engine = (input: string, options: OptionValues) => EngineResult;

export function normalizeResult(result: EngineResult): {
  output: string;
  notes: string[];
} {
  return typeof result === "string"
    ? { output: result, notes: [] }
    : { output: result.output, notes: result.notes ?? [] };
}

export type Direction = "forward" | "reverse";

/** Onde a operação foi de fato executada — alimenta o aviso de privacidade. */
export type ProcessedOn = "client" | "server";

export type OperationOutcome =
  | { ok: true; output: string; processedOn: ProcessedOn; notes: string[] }
  | { ok: false; error: string; position?: number; processedOn: ProcessedOn };

export type OperationGroup = "Codificação" | "Formato" | "Compactação";

/** Rótulos de um sentido da operação. Dados puros — atravessam o limite servidor/cliente. */
export type DirectionMeta = {
  label: string;
  inputLabel: string;
  outputLabel: string;
};

/**
 * Descritor serializável de uma operação: tudo que header, página inicial e
 * metadados de SEO precisam saber. Não contém motor — funções não cruzam o
 * limite entre servidor e cliente, e manter o catálogo livre delas também
 * evita que todos os motores entrem no bundle de toda página.
 */
export type OperationMeta = {
  slug: string;
  /** Nome curto, usado no seletor do header. */
  name: string;
  /** Título serifado no topo da tela. */
  title: string;
  /** Subtítulo curto, em cinza, abaixo do título. */
  subtitle: string;
  /** Descrição para os metadados da rota. */
  description: string;
  group: OperationGroup;
  /**
   * `text`: dois painéis de texto com conversão em tempo real.
   * `file`: seleção de arquivo, listagem e download. O padrão é `text`.
   */
  kind?: "text" | "file";
  /**
   * `client`: sempre roda no navegador.
   * `auto`: pode ir ao backend conforme tamanho, formato ou nível.
   */
  execution: "client" | "auto";
  forward: DirectionMeta;
  /** Ausente quando a operação não admite inversão. */
  reverse?: DirectionMeta;
  options: OptionSpec[];
  /** Exemplo curto usado como placeholder do painel de entrada. */
  placeholder?: string;
  /**
   * Ações que preenchem a entrada com um valor gerado na hora. São
   * identificadores, não funções: o catálogo precisa atravessar o limite
   * servidor/cliente, e funções não atravessam.
   */
  quickActions?: QuickAction[];
};

/** `now` insere o instante atual na entrada. */
export type QuickAction = "now";

/** O descritor com os motores acoplados, montado apenas onde há execução. */
export type Operation = OperationMeta & {
  engines: { forward: Engine; reverse?: Engine };
};

export function defaultOptionValues(operation: OperationMeta): OptionValues {
  const values: OptionValues = {};
  for (const option of operation.options) {
    values[option.id] = option.default;
  }
  return values;
}

export function isReversible(operation: OperationMeta): boolean {
  return operation.reverse !== undefined;
}

/** Rótulos do sentido ativo. */
export function directionOf(
  operation: OperationMeta,
  direction: Direction,
): DirectionMeta {
  return direction === "reverse" && operation.reverse
    ? operation.reverse
    : operation.forward;
}

/** Motor do sentido ativo. */
export function engineOf(operation: Operation, direction: Direction): Engine {
  return direction === "reverse" && operation.engines.reverse
    ? operation.engines.reverse
    : operation.engines.forward;
}
