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
  "juntar-linhas": {
    name: "Join lines",
    title: "Join lines",
    subtitle: "Join every line into a single one, with the separator the next tool expects.",
    description:
      "Join several lines of text into a single line, with separator choice, whitespace trimming, and empty-line removal, processed in your browser.",
    forward: { label: "Join", inputLabel: "Text", outputLabel: "Single line" },
  },
  "json-format": { title: "JSON: beautify and minify" },
  "xml-format": { title: "XML: beautify and minify" },
  compactar: {
    name: "Compress",
    title: "Compress files",
    subtitle:
      "Pick a format, gather the files, and download. ZIP and TAR hold several; GZIP and ZSTD, one at a time.",
    description:
      "ZIP, GZIP, ZSTD, and TAR compressor with level presets, processed in your browser. No accounts, history, or stored files.",
    forward: { label: "Compress", inputLabel: "Files", outputLabel: "Archive" },
  },
  descompactar: {
    name: "Extract",
    title: "Extract",
    subtitle: "Open a file from disk or paste its Base64 contents, and inspect what is inside before extracting.",
    description: "Extractor for ZIP, RAR, 7Z, TAR, GZIP, and ZSTD, from a file or from pasted Base64, with entry listing and selective extraction.",
    forward: { label: "Extract", inputLabel: "Archive", outputLabel: "Contents" },
  },
};

const optionTranslations: Record<string, string> = {
  "Indentação": "Indentation", "2 espaços": "2 spaces", "4 espaços": "4 spaces", "Tabulação": "Tabs",
  "Ordenar chaves": "Sort keys", "Alfabeto": "Alphabet",
  "Padrão (RFC 4648 §4)": "Standard (RFC 4648 §4)", "Preenchimento com =": "Padding with =",
  "Nível de compressão": "Compression level",
  "Separador": "Separator", "Nada": "None", "Espaço": "Space", "Vírgula": "Comma",
  "Vírgula + espaço": "Comma + space", "Ponto e vírgula": "Semicolon", "Barra vertical": "Pipe",
  "Aparar espaços": "Trim whitespace", "Descartar linhas vazias": "Drop empty lines",
  "Nível exato": "Exact level", "Rápido": "Fast", "Equilibrado": "Balanced", "Máximo": "Maximum", "Customizado": "Custom",
};

const helpTranslations: Record<string, string> = {
  "Desligado, a ordem original das chaves é preservada.": "When off, the original key order is preserved.",
  "O alfabeto URL-safe troca + e / por - e _.": "The URL-safe alphabet replaces + and / with - and _.",
  "Desligado, a saída não recebe os caracteres = do fim.": "When off, output does not include trailing = characters.",
  "Vale apenas com o preset Customizado.": "Only applies with the Custom preset.",
  "Entra entre as linhas, nunca antes da primeira nem depois da última.":
    "Goes between lines, never before the first or after the last.",
  "Desligado, os espaços das pontas de cada linha entram na saída.":
    "When off, the whitespace around each line ends up in the output.",
  "Desligado, cada linha vazia vira um separador na saída.":
    "When off, each empty line becomes a separator in the output.",
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
  const isFormatter = /^(json|xml)-format$/.test(operation.slug);
  // Só as rotas por formato entram na regra genérica "Compress to X"; as duas
  // entradas canônicas têm texto próprio na tabela acima.
  const isCompression =
    operation.group === "Compactação" &&
    operation.slug !== "compactar" &&
    operation.slug !== "descompactar";
  const title = isCompression ? `Compress to ${operation.name}` : translation?.title ?? operation.title;
  const subtitle = isCompression
    ? `Compress files ${operation.slug === "zip" || operation.slug === "tar" ? "together " : ""}with level controls.`
    : isFormatter
      ? `Format ${operation.name.replace(" beautify", "")} for readability or remove unnecessary whitespace without changing its contents.`
      : translation?.subtitle ?? operation.subtitle;
  const description = isCompression
    ? `${operation.name} compressor with level presets. No accounts, history, or stored files.`
    : isFormatter
      ? `${operation.name.replace(" beautify", "")} formatter and minifier with configurable indentation, processed in your browser.`
      : translation?.description ?? operation.description;
  const direction = (value: OperationMeta["forward"] | undefined) => value;
  const forward = translation?.forward ?? (isCompression
    ? { label: "Compress", inputLabel: "Files", outputLabel: operation.name }
    : operation.forward);
  const reverse = translation?.reverse ?? operation.reverse;
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

/**
 * Casamento da busca da home. Os aliases entram junto porque quem procura
 * digita "unzip" ou "b64", quase nunca o nome que a ferramenta usa — e vive
 * aqui, e não no componente, para que o vínculo entre alias e busca possa ser
 * testado sem renderizar nada.
 */
export function matchesQuery(
  operation: OperationMeta,
  normalizedQuery: string,
  language: Language,
): boolean {
  const localized = localizeOperation(operation, language);
  return [localized.name, localized.title, localized.subtitle, ...(operation.aliases ?? [])]
    .join(" ")
    .toLocaleLowerCase(localeOf(language))
    .includes(normalizedQuery);
}

/** A tag de idioma usada nas comparações sensíveis a locale. */
export function localeOf(language: Language): string {
  return language === "pt" ? "pt-BR" : "en";
}

export const languageBootScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)});document.documentElement.lang=l==="en"?"en":"pt-BR";}catch(e){document.documentElement.lang="pt-BR";}})();`;
