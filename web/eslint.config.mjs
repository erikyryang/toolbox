import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Literais de cor proibidos em código de componente: hexadecimais, funções de
 * cor CSS e classes utilitárias com cor arbitrária. A única fonte de cor é
 * src/design/tokens.ts, consumida através dos tokens semânticos.
 */
const forbiddenColorLiteral =
  /((?<![&\w])#[0-9a-fA-F]{3,8}\b)|(\b(rgb|rgba|hsl|hsla|oklch|lab|lch|color-mix)\s*\()|(\[#[0-9a-fA-F]{3,8}\])/;

const colorLiteralMessage =
  "Cor literal proibida em componente. Use um token semântico (bg-surface, text-muted, border-interactive, …). A fonte de cor é src/design/tokens.ts.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "toolbox/tokens-only-color",
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${forbiddenColorLiteral.source}/]`,
          message: colorLiteralMessage,
        },
        {
          selector: `TemplateElement[value.raw=/${forbiddenColorLiteral.source}/]`,
          message: colorLiteralMessage,
        },
        {
          selector: `JSXAttribute[name.name='style'] ObjectExpression`,
          message:
            "Estilo inline não é permitido em componente — o estilo vem dos tokens, via classes utilitárias.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/design/tokens",
              importNames: ["sand", "terracotta", "rust"],
              message:
                "Primitivas de cor não são consumidas por componentes. Use os tokens semânticos gerados em tokens.css.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/app/tokens.css",
  ]),
]);

export default eslintConfig;
