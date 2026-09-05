"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

import type { OperationGroup, OperationMeta, OptionSpec } from "@/lib/operations/types";

export const LANGUAGE_STORAGE_KEY = "toolbox:language";

export type Language = "pt" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(subscribeToLanguage, currentLanguage, () => "pt");

  function setLanguage(next: Language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // A preferência vale só para esta sessão quando o armazenamento bloqueia.
    }
    document.documentElement.lang = next === "pt" ? "pt-BR" : "en";
    window.dispatchEvent(new Event("toolbox:languagechange"));
  }

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}

function currentLanguage(): Language {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

function subscribeToLanguage(onChange: () => void): () => void {
  const event = () => onChange();
  window.addEventListener("storage", event);
  window.addEventListener("toolbox:languagechange", event);
  return () => {
    window.removeEventListener("storage", event);
    window.removeEventListener("toolbox:languagechange", event);
  };
}

const groupNames: Record<Language, Record<OperationGroup, string>> = {
  pt: { Codificação: "Codificação", Formato: "Formato", Compactação: "Compactação" },
  en: { Codificação: "Encoding", Formato: "Formats", Compactação: "Compression" },
};

export function groupName(group: OperationGroup, language: Language): string {
  return groupNames[language][group];
}

const englishOperations: Partial<Record<string, Partial<OperationMeta>>> = {
  base64: {
    subtitle: "Encode and decode Base64 with standard and URL-safe alphabets, with or without padding.",
    description: "Base64 encoder and decoder (RFC 4648), standard and URL-safe, processed entirely in your browser.",
    forward: { label: "Encode", inputLabel: "Text", outputLabel: "Base64" },
    reverse: { label: "Decode", inputLabel: "Base64", outputLabel: "Text" },
  },
  hex: {
    title: "Hexadecimal",
    subtitle: "Convert text to hexadecimal bytes and back, accepting spaces and line breaks in the input.",
    description: "Hexadecimal converter: text to bytes and bytes to text, with case and separator controls in your browser.",
    forward: { label: "Encode", inputLabel: "Text", outputLabel: "Hexadecimal" },
    reverse: { label: "Decode", inputLabel: "Hexadecimal", outputLabel: "Text" },
  },
  "jwt-decode": {
    subtitle: "Show a JSON Web Token header, payload, and dates. The signature is not verified.",
    description: "JWT decoder: header, payload, and time claims in readable dates without sending the token anywhere.",
    forward: { label: "Decode", inputLabel: "Token", outputLabel: "Contents" },
  },
  "unicode-escape": {
    subtitle: "Convert text to escape sequences and back, with correct surrogate pairs outside the BMP.",
    description: "Unicode escape converter for \\uXXXX, \\u{...}, and \\xXX styles, processed in your browser.",
    forward: { label: "Escape", inputLabel: "Text", outputLabel: "Escaped" },
    reverse: { label: "Unescape", inputLabel: "Escaped", outputLabel: "Text" },
  },
  "query-string": {
    subtitle: "Parse a query string into readable pairs and rebuild it while preserving repeated keys.",
    description: "Query string parser and serializer with repeated-key preservation and optional sorting.",
    forward: { label: "Parse", inputLabel: "Query string", outputLabel: "Pairs" },
    reverse: { label: "Build", inputLabel: "Pairs", outputLabel: "Query string" },
  },
  charset: {
    title: "UTF-8 and Latin-1 charset",
    subtitle: "Encode text in one charset and read it in another to repair mojibake.",
    description: "Charset converter between UTF-8 and ISO-8859-1 (Latin-1), reporting characters that cannot be represented.",
    forward: { label: "Convert", inputLabel: "Text", outputLabel: "Reinterpreted" },
    reverse: { label: "Invert charsets", inputLabel: "Text", outputLabel: "Reinterpreted" },
  },
  base32: {
    subtitle: "Encode and decode Base32 (RFC 4648), with optional padding.",
    description: "Base32 encoder and decoder (RFC 4648), processed in your browser.",
    forward: { label: "Encode", inputLabel: "Text", outputLabel: "Base32" },
    reverse: { label: "Decode", inputLabel: "Base32", outputLabel: "Text" },
  },
  base58: {
    subtitle: "Encode and decode Base58 with the Bitcoin alphabet, which omits ambiguous characters.",
    description: "Base58 encoder and decoder with the Bitcoin alphabet, preserving leading zeroes in your browser.",
    forward: { label: "Encode", inputLabel: "Text", outputLabel: "Base58" },
    reverse: { label: "Decode", inputLabel: "Base58", outputLabel: "Text" },
  },
  "json-format": { title: "JSON: beautify and minify" },
  "xml-format": { title: "XML: beautify and minify" },
  descompactar: {
    name: "Extract",
    title: "Extract",
    subtitle: "Open ZIP, TAR, GZIP, and XZ in your browser and inspect contents before extraction. ZSTD, BZIP2, RAR, and 7Z use the server.",
    description: "Extractor for ZIP, RAR, 7Z, TAR, GZIP, ZSTD, XZ, and BZIP2, with entry listing and selective extraction.",
    forward: { label: "Extract", inputLabel: "Archive", outputLabel: "Contents" },
  },
};

const optionTranslations: Record<string, string> = {
  "Indentação": "Indentation", "2 espaços": "2 spaces", "4 espaços": "4 spaces", "Tabulação": "Tabs",
  "Ordenar chaves": "Sort keys", "Delimitador": "Delimiter", "Vírgula": "Comma", "Ponto e vírgula": "Semicolon",
  "Barra vertical": "Pipe", "Caractere de citação": "Quote character", "Aspas duplas": "Double quotes",
  "Aspas simples": "Single quotes", "Primeira linha é cabeçalho": "First row is a header",
  "Converter números e booleanos": "Convert numbers and booleans", "Alfabeto": "Alphabet",
  "Padrão (RFC 4648 §4)": "Standard (RFC 4648 §4)", "Preenchimento com =": "Padding with =",
  "Caixa dos dígitos": "Digit case", "Minúscula": "Lowercase", "Maiúscula": "Uppercase",
  "Separador": "Separator", "Nenhum": "None", "Espaço a cada byte": "Space after each byte",
  "Estilo": "Style", "Escapar apenas fora do ASCII": "Escape non-ASCII only", "Ordenar por chave": "Sort by key",
  "Codificar em": "Encode as", "Ler como": "Read as", "Nível de compressão": "Compression level",
  "Nível exato": "Exact level", "Rápido": "Fast", "Equilibrado": "Balanced", "Máximo": "Maximum", "Customizado": "Custom",
};

const helpTranslations: Record<string, string> = {
  "Desligado, a ordem original das chaves é preservada.": "When off, the original key order is preserved.",
  "Desligado, cada linha vira uma lista de valores em vez de um objeto.": "When off, each row becomes a list of values instead of an object.",
  "Ligado, \"1\" vira 1 e \"true\" vira true na leitura do CSV.": "When on, \"1\" becomes 1 and \"true\" becomes true while reading CSV.",
  "O alfabeto URL-safe troca + e / por - e _.": "The URL-safe alphabet replaces + and / with - and _.",
  "Desligado, a saída não recebe os caracteres = do fim.": "When off, output does not include trailing = characters.",
  "Só afeta a saída; na entrada, espaços são sempre tolerados.": "Only affects output; spaces are always accepted in input.",
  "O charset usado para transformar o texto em bytes.": "The charset used to turn text into bytes.",
  "O charset usado para ler esses bytes de volta como texto.": "The charset used to read those bytes back as text.",
  "Vale apenas com o preset Customizado.": "Only applies with the Custom preset.",
};

function localizeOption(option: OptionSpec, language: Language): OptionSpec {
  if (language === "pt") return option;
  const translate = (value: string) => optionTranslations[value] ?? helpTranslations[value] ?? value;
  if (option.kind === "boolean") return { ...option, label: translate(option.label), help: option.help && translate(option.help) };
  return {
    ...option,
    label: translate(option.label),
    help: option.help && translate(option.help),
    choices: option.choices.map((choice) => ({ ...choice, label: translate(choice.label) })),
  };
}

export function localizeOperation(operation: OperationMeta, language: Language): OperationMeta {
  if (language === "pt") return operation;
  const translation = englishOperations[operation.slug];
  const isFormatPair = /^(json|yaml|xml|csv)-(json|yaml|xml|csv)$/.test(operation.slug);
  const isFormatter = /^(json|xml)-format$/.test(operation.slug);
  const isCompression = operation.group === "Compactação" && operation.slug !== "descompactar";
  const title = isCompression ? `Compress to ${operation.name}` : translation?.title ?? operation.title;
  const subtitle = isCompression
    ? `Compress files ${operation.slug === "zip" || operation.slug === "tar" ? "together " : ""}with level controls.`
    : isFormatPair
      ? `Convert ${operation.name.replace(" ⇄ ", " to ")} and back, with warnings for values a format cannot represent.`
      : isFormatter
        ? `Format ${operation.name.replace(" beautify", "")} for readability or remove unnecessary whitespace without changing its contents.`
      : translation?.subtitle ?? operation.subtitle;
  const description = isCompression
    ? `${operation.name} compressor with level presets. No accounts, history, or stored files.`
    : isFormatPair
      ? `${operation.name.replace(" ⇄ ", " converter, ")} processed in your browser.`
      : isFormatter
        ? `${operation.name.replace(" beautify", "")} formatter and minifier with configurable indentation, processed in your browser.`
      : translation?.description ?? operation.description;
  const direction = (value: OperationMeta["forward"] | undefined) => value;
  const forward = translation?.forward ?? (isCompression
    ? { label: "Compress", inputLabel: "Files", outputLabel: operation.name }
    : operation.forward);
  const reverse = translation?.reverse ?? (isFormatPair
    ? operation.reverse
    : operation.reverse);
  return {
    ...operation,
    group: operation.group,
    name: translation?.name ?? operation.name,
    title,
    subtitle,
    description,
    forward: direction(forward)!,
    reverse: direction(reverse),
    options: operation.options.map((option) => localizeOption(option, language)),
  };
}

export const languageBootScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)});document.documentElement.lang=l==="en"?"en":"pt-BR";}catch(e){document.documentElement.lang="pt-BR";}})();`;
