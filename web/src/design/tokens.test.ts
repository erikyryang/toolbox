import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isPureBlackOrWhite,
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

  it("preserva a paleta de sistema", () => {
    expect(themes.light.surface).toBe("#f5f5f7");
    expect(themes.dark.surface).toBe("#161617");
    expect(themes.light.text).toBe("#1d1d1f");
    expect(themes.light.accent).toBe("#0071e3");
    expect(themes.dark.accent).toBe("#2997ff");
  });

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
