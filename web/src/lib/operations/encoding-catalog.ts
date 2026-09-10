import type { OperationMeta } from "./types.ts";

/**
 * Entradas de catálogo das operações de codificação da fase 2. Dados puros,
 * como todo o catálogo.
 */

export const encodingOperationsPhase2: OperationMeta[] = [
  {
    slug: "base32",
    name: "Base32",
    title: "Base32",
    subtitle: "Codifica e decodifica Base32 (RFC 4648), com preenchimento opcional.",
    description:
      "Codificador e decodificador Base32 conforme a RFC 4648, processado no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    aliases: ["base32", "b32", "rfc 4648"],
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base32" },
    reverse: { label: "Decodificar", inputLabel: "Base32", outputLabel: "Texto" },
    options: [
      {
        kind: "boolean",
        id: "padding",
        label: "Preenchimento com =",
        default: true,
      },
    ],
  },
  {
    slug: "base58",
    name: "Base58",
    title: "Base58",
    subtitle:
      "Codifica e decodifica Base58 no alfabeto Bitcoin, que omite os caracteres ambíguos.",
    description:
      "Codificador e decodificador Base58 (alfabeto Bitcoin), preservando zeros à esquerda, no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    aliases: ["base58", "b58", "bitcoin"],
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base58" },
    reverse: { label: "Decodificar", inputLabel: "Base58", outputLabel: "Texto" },
    options: [],
  },
];
