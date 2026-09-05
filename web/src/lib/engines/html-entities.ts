import type { OptionValues } from "../operations/types.ts";
import { OperationError } from "./errors.ts";

/**
 * Entidades HTML.
 *
 * O escape cobre os cinco caracteres que mudam a interpretação do markup; o
 * unescape cobre as referências numéricas (decimais e hexadecimais) e as
 * entidades nomeadas de uso corrente — a tabela completa do HTML5 tem mais de
 * dois mil nomes, e carregá-la inteira não se justifica para o ganho.
 */

const NAMED_TO_CHAR: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
  copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", deg: "°", plusmn: "±", times: "×", divide: "÷",
  frac12: "½", frac14: "¼", sup2: "²", sup3: "³", micro: "µ", para: "¶",
  sect: "§", middot: "·", bull: "•", dagger: "†", euro: "€", pound: "£",
  yen: "¥", cent: "¢", curren: "¤", iexcl: "¡", iquest: "¿", szlig: "ß",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  aelig: "æ", ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", ntilde: "ñ", ograve: "ò",
  oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", oslash: "ø", ugrave: "ù",
  uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", yuml: "ÿ",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å",
  AElig: "Æ", Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï", Ntilde: "Ñ", Ograve: "Ò",
  Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", Oslash: "Ø", Ugrave: "Ù",
  Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", pi: "π", sigma: "σ",
  omega: "ω", Omega: "Ω", larr: "←", rarr: "→", uarr: "↑", darr: "↓",
  harr: "↔", ne: "≠", le: "≤", ge: "≥", infin: "∞", sum: "∑", radic: "√",
  int: "∫", asymp: "≈", equiv: "≡", part: "∂", prod: "∏", empty: "∅",
  isin: "∈", notin: "∉", cap: "∩", cup: "∪", sub: "⊂", sup: "⊃",
  ensp: "\u2002", emsp: "\u2003", thinsp: "\u2009", shy: "\u00ad",
  zwnj: "\u200c", zwj: "\u200d", lrm: "\u200e", rlm: "\u200f",
};

const MARKUP_ESCAPES: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
  [/'/g, "&#39;"],
];

export function escapeHtml(input: string, options: OptionValues): string {
  let out = input;
  for (const [pattern, replacement] of MARKUP_ESCAPES) {
    out = out.replace(pattern, replacement);
  }

  if (options.nonAscii === true) {
    out = out.replace(/[\u0080-\uffff]/g, (char) => `&#${char.charCodeAt(0)};`);
  }

  return out;
}

export function unescapeHtml(input: string): string {
  return input.replace(
    /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
          throw new OperationError(
            `A referência numérica "${match}" está fora do intervalo Unicode.`,
            input.indexOf(match),
          );
        }
        return String.fromCodePoint(code);
      }

      const named = NAMED_TO_CHAR[body];
      // Entidade desconhecida fica como está: pode ser texto literal.
      return named === undefined ? match : named;
    },
  );
}
