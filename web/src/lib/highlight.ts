/**
 * Realce de sintaxe para os painéis de saída de JSON e XML.
 *
 * É um tokenizador próprio, e não uma biblioteca, por três razões: só existem
 * dois formatos a cobrir, a entrada já passou pelo parser do motor (o que
 * dispensa recuperação de erro), e um destacador genérico custaria mais bytes
 * de bundle do que todo o resto da rota.
 *
 * Invariante: a concatenação de `text` de todos os tokens é idêntica à
 * entrada. É o que garante que o realce nunca altere o que está escrito —
 * e o teste cobre exatamente isso.
 */

export type TokenKind =
  | "key"
  | "string"
  | "number"
  | "atom"
  | "attr"
  | "punct"
  | "plain";

export type Token = { text: string; kind: TokenKind };

export type SyntaxLanguage = "json" | "xml";

export function highlight(language: SyntaxLanguage, source: string): Token[] {
  const tokens = language === "json" ? tokenizeJson(source) : tokenizeXml(source);
  return merge(tokens);
}

/** Junta tokens vizinhos do mesmo tipo — menos nós no DOM, mesmo resultado. */
function merge(tokens: Token[]): Token[] {
  const merged: Token[] = [];
  for (const token of tokens) {
    if (token.text === "") continue;
    const last = merged[merged.length - 1];
    if (last && last.kind === token.kind) last.text += token.text;
    else merged.push({ ...token });
  }
  return merged;
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

function tokenizeJson(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '"') {
      const end = endOfJsonString(source, index);
      const text = source.slice(index, end);
      // Uma string é chave quando o próximo caractere significativo é ':'.
      tokens.push({ text, kind: nextMeaningful(source, end) === ":" ? "key" : "string" });
      index = end;
      continue;
    }

    if (char === "-" || (char >= "0" && char <= "9")) {
      const match = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(source.slice(index));
      if (match) {
        tokens.push({ text: match[0], kind: "number" });
        index += match[0].length;
        continue;
      }
    }

    const atom = ["true", "false", "null"].find((word) => source.startsWith(word, index));
    if (atom) {
      tokens.push({ text: atom, kind: "atom" });
      index += atom.length;
      continue;
    }

    if ("{}[]:,".includes(char)) {
      tokens.push({ text: char, kind: "punct" });
      index += 1;
      continue;
    }

    tokens.push({ text: char, kind: "plain" });
    index += 1;
  }

  return tokens;
}

/** Índice logo após a aspa de fechamento, respeitando escapes. */
function endOfJsonString(source: string, start: number): number {
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === '"') return index + 1;
    index += 1;
  }
  // String não terminada: consome o resto em vez de perder caracteres.
  return source.length;
}

function nextMeaningful(source: string, from: number): string {
  for (let index = from; index < source.length; index += 1) {
    if (!/\s/.test(source[index])) return source[index];
  }
  return "";
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

function tokenizeXml(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] !== "<") {
      const next = source.indexOf("<", index);
      const end = next === -1 ? source.length : next;
      tokens.push({ text: source.slice(index, end), kind: "plain" });
      index = end;
      continue;
    }

    // Comentários, CDATA e declarações saem inteiros, sem análise interna.
    const opaque = ["<!--", "<![CDATA[", "<!", "<?"].find((prefix) =>
      source.startsWith(prefix, index),
    );
    if (opaque) {
      const closer = opaque === "<!--" ? "-->" : opaque === "<![CDATA[" ? "]]>" : opaque === "<?" ? "?>" : ">";
      const close = source.indexOf(closer, index + opaque.length);
      const end = close === -1 ? source.length : close + closer.length;
      tokens.push({ text: source.slice(index, end), kind: "punct" });
      index = end;
      continue;
    }

    const close = source.indexOf(">", index);
    const end = close === -1 ? source.length : close + 1;
    tokens.push(...tokenizeXmlTag(source.slice(index, end)));
    index = end;
  }

  return tokens;
}

function tokenizeXmlTag(tag: string): Token[] {
  const tokens: Token[] = [];
  // Abertura: '<', '</' e o nome do elemento.
  const opening = /^<\/?/.exec(tag)![0];
  tokens.push({ text: opening, kind: "punct" });

  let index = opening.length;
  const name = /^[^\s/>]*/.exec(tag.slice(index))![0];
  tokens.push({ text: name, kind: "key" });
  index += name.length;

  while (index < tag.length) {
    const rest = tag.slice(index);

    const space = /^\s+/.exec(rest);
    if (space) {
      tokens.push({ text: space[0], kind: "plain" });
      index += space[0].length;
      continue;
    }

    const attribute = /^[^\s=/>]+/.exec(rest);
    if (attribute && rest[0] !== "/" && rest[0] !== ">") {
      tokens.push({ text: attribute[0], kind: "attr" });
      index += attribute[0].length;
      continue;
    }

    if (rest[0] === "=") {
      tokens.push({ text: "=", kind: "punct" });
      index += 1;
      const value = /^\s*("[^"]*"?|'[^']*'?)/.exec(tag.slice(index));
      if (value) {
        tokens.push({ text: value[0], kind: "string" });
        index += value[0].length;
      }
      continue;
    }

    tokens.push({ text: rest[0], kind: "punct" });
    index += 1;
  }

  return tokens;
}
