import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isPureBlackOrWhite,
  isWarm,
} from "./contrast.ts";
import {
  MIN_RATIO,
  SEMANTIC_TOKEN_NAMES,
  contrastPairs,
  themes,
  type ThemeName,
} from "./tokens.ts";

const themeNames: ThemeName[] = ["light", "dark"];

describe("tokens semânticos", () => {
  it.each(themeNames)("o tema %s define todos os tokens", (theme) => {
    for (const name of SEMANTIC_TOKEN_NAMES) {
      expect(themes[theme][name], `token ausente: ${name}`).toMatch(
        /^#[0-9a-f]{6}$/,
      );
    }
  });

  it("preserva a paleta de papel quente", () => {
    expect(themes.light.surface).toBe("#faf7f1");
    expect(themes.light["surface-raised"]).toBe("#f3ebdd");
    expect(themes.dark.surface).toBe("#171310");
    expect(themes.dark["surface-raised"]).toBe("#26201a");
    expect(themes.light.text).toBe("#201c15");
    expect(themes.dark.text).toBe("#ede5d8");
    expect(themes.light.accent).toBe("#b3431f");
    expect(themes.dark.accent).toBe("#e0784a");
  });

  /*
   * A paleta de sintaxe é a única exceção à regra de tom quente — ela precisa
   * de hues separados para distinguir chave, string, número e átomo. Todo o
   * resto é neutro ou acento, e neutro frio é o que a troca de paleta veio
   * desfazer.
   */
  const warmTokens = [
    "surface",
    "surface-raised",
    "text",
    "text-muted",
    "border",
    "border-interactive",
    "accent",
    "accent-solid",
    "accent-solid-hover",
    "accent-foreground",
    "accent-text",
    "focus-ring",
  ] as const;

  it.each(themeNames)("nenhum neutro do tema %s é frio", (theme) => {
    for (const name of warmTokens) {
      const value = themes[theme][name];
      expect(isWarm(value), `${name} = ${value}`).toBe(true);
    }
  });

  const syntaxTokens = [
    "syntax-key",
    "syntax-string",
    "syntax-number",
    "syntax-atom",
    "syntax-attr",
    "syntax-punct",
  ] as const;

  it.each(themeNames)(
    "nenhuma cor de sintaxe do tema %s se confunde com o acento",
    (theme) => {
      for (const name of syntaxTokens) {
        expect(themes[theme][name], name).not.toBe(themes[theme].accent);
        expect(themes[theme][name], name).not.toBe(themes[theme]["accent-solid"]);
      }
    },
  );

  it.each(themeNames)(
    "nenhum token do tema %s é branco ou preto puro",
    (theme) => {
      for (const [name, value] of Object.entries(themes[theme])) {
        expect(isPureBlackOrWhite(value), `${name} = ${value}`).toBe(false);
      }
    },
  );

});

describe("contraste AA", () => {
  for (const theme of themeNames) {
    for (const pair of contrastPairs) {
      const required = MIN_RATIO[pair.usage];
      it(`${theme}: ${pair.foreground} sobre ${pair.background} (${pair.description}) atinge ${required}:1`, () => {
        const ratio = contrastRatio(
          themes[theme][pair.foreground],
          themes[theme][pair.background],
        );
        expect(
          Number(ratio.toFixed(2)),
          `${themes[theme][pair.foreground]} sobre ${themes[theme][pair.background]} = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(required);
      });
    }
  }
});

describe("tokens.css gerado", () => {
  it("está em dia com tokens.ts", async () => {
    const { buildTokensCss } = await import("./build-css.ts");
    const { readFileSync } = await import("node:fs");
    const onDisk = readFileSync(
      new URL("../app/tokens.css", import.meta.url),
      "utf8",
    );
    expect(
      onDisk,
      "src/app/tokens.css divergiu dos tokens — rode `npm run tokens`",
    ).toBe(buildTokensCss());
  });

  it("não sobrescreve tokens semânticos com aliases recursivos do shadcn", async () => {
    const { buildTokensCss } = await import("./build-css.ts");
    const css = buildTokensCss();
    expect(css).not.toContain("--accent: var(--surface-raised)");
    expect(css).not.toContain("--accent-foreground: var(--text)");
    expect(css).not.toContain("--border: var(--border)");
  });
});
