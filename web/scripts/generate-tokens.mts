/**
 * Gera src/app/tokens.css a partir de src/design/tokens.ts.
 *
 * Rode com `npm run tokens`. O arquivo gerado é versionado para que o build
 * não dependa da geração, mas nunca deve ser editado à mão.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildTokensCss } from "../src/design/build-css.ts";

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/app/tokens.css");
const css = buildTokensCss();

writeFileSync(outPath, css, "utf8");
console.log(`tokens.css gerado (${css.length} bytes)`);
