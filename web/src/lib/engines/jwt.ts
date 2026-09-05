import type { EngineResult, OptionValues } from "../operations/types.ts";
import { fromBase64, utf8Decode } from "./bytes.ts";
import { OperationError } from "./errors.ts";

/**
 * Decodificação de JWT.
 *
 * A assinatura NÃO é verificada — e a interface diz isso em voz alta. Verificar
 * exigiria a chave, e pedir a chave do usuário contraria a premissa do produto.
 * O que se pode afirmar sem a chave são as datas, e é o que se afirma.
 */

const TEMPORAL_CLAIMS: Record<string, string> = {
  iat: "emitido em",
  exp: "expira em",
  nbf: "válido a partir de",
  auth_time: "autenticado em",
};

function decodeSegment(segment: string, name: string): unknown {
  let json: string;
  try {
    json = utf8Decode(fromBase64(segment, "urlsafe"));
  } catch {
    throw new OperationError(
      `O ${name} do token não está em Base64 URL-safe válido.`,
    );
  }

  try {
    return JSON.parse(json);
  } catch {
    throw new OperationError(`O ${name} do token não contém JSON válido.`);
  }
}

function formatInstant(seconds: number): string {
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? "data inválida" : date.toISOString();
}

export function decodeJwt(input: string, options: OptionValues): EngineResult {
  const token = input.trim();
  if (token === "") return "";

  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new OperationError(
      `Um JWT tem três segmentos separados por ponto; a entrada tem ${parts.length}.`,
    );
  }

  const header = decodeSegment(parts[0], "cabeçalho");
  const payload = decodeSegment(parts[1], "payload");
  const indent = options.indent === "tab" ? "\t" : 2;

  const notes: string[] = [
    "A assinatura não foi verificada — decodificar um JWT não prova que ele é autêntico.",
  ];

  const claims = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const now = Date.now() / 1000;
  const readable: string[] = [];

  for (const [claim, label] of Object.entries(TEMPORAL_CLAIMS)) {
    const value = claims[claim];
    if (typeof value !== "number") continue;
    readable.push(`${claim} (${label}): ${formatInstant(value)}`);
  }

  if (typeof claims.exp === "number" && claims.exp < now) {
    notes.push(`Token expirado em ${formatInstant(claims.exp)}.`);
  }
  if (typeof claims.nbf === "number" && claims.nbf > now) {
    notes.push(`Token ainda não é válido: começa a valer em ${formatInstant(claims.nbf)}.`);
  }

  const sections = [
    "// cabeçalho",
    JSON.stringify(header, null, indent),
    "",
    "// payload",
    JSON.stringify(payload, null, indent),
  ];

  if (readable.length > 0) {
    sections.push("", "// datas", ...readable);
  }

  sections.push(
    "",
    "// assinatura (não verificada)",
    parts[2] === "" ? "(vazia)" : parts[2],
  );

  return { output: sections.join("\n"), notes };
}
