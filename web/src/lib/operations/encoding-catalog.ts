import type { OperationMeta } from "./types.ts";

/**
 * Entradas de catálogo das operações de codificação. Dados puros, como todo o
 * catálogo, em ordem alfabética: é essa ordem que a navegação exibe.
 */

export const encodingOperations: OperationMeta[] = [
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
  {
    slug: "base64",
    name: "Base64",
    title: "Base64",
    subtitle:
      "Codifica e decodifica Base64 nos alfabetos padrão e URL-safe, com ou sem preenchimento.",
    description:
      "Codificador e decodificador Base64 (RFC 4648), padrão e URL-safe, processado inteiramente no seu navegador.",
    group: "Codificação",
    execution: "client",
    placeholder: "toolbox",
    aliases: ["base64", "b64", "atob", "btoa", "rfc 4648", "url-safe"],
    forward: { label: "Codificar", inputLabel: "Texto", outputLabel: "Base64" },
    reverse: { label: "Decodificar", inputLabel: "Base64", outputLabel: "Texto" },
    options: [
      {
        kind: "select",
        id: "alphabet",
        label: "Alfabeto",
        help: "O alfabeto URL-safe troca + e / por - e _.",
        default: "standard",
        choices: [
          { value: "standard", label: "Padrão (RFC 4648 §4)" },
          { value: "urlsafe", label: "URL-safe (RFC 4648 §5)" },
        ],
      },
      {
        kind: "boolean",
        id: "padding",
        label: "Preenchimento com =",
        help: "Desligado, a saída não recebe os caracteres = do fim.",
        default: true,
      },
    ],
  },
];
