/**
 * Cálculo de contraste WCAG 2.1. Usado pela verificação automatizada de
 * contraste dos tokens e por nada mais — não é código de runtime da UI.
 */

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Cor hexadecimal inválida: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Uma cor é "quente" quando o canal vermelho não é o menor dos três. */
export function isWarm(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  return r >= g && g >= b;
}

export function isPureBlackOrWhite(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  return (r === 255 && g === 255 && b === 255) || (r === 0 && g === 0 && b === 0);
}
