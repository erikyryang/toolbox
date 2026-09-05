/**
 * Copia os arquivos de fonte dos pacotes @fontsource-variable para src/fonts.
 *
 * As fontes são vendorizadas no repositório de propósito: o build não depende
 * de rede e o navegador nunca pede uma fonte a um domínio de terceiros.
 * Rode `npm run fonts:sync` ao atualizar um pacote de fonte.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../src/fonts");
mkdirSync(outDir, { recursive: true });

const files = [
  ["inter", "inter-latin-wght-normal.woff2", "inter-variable.woff2"],
  ["newsreader", "newsreader-latin-wght-normal.woff2", "newsreader-variable.woff2"],
  ["jetbrains-mono", "jetbrains-mono-latin-wght-normal.woff2", "jetbrains-mono-variable.woff2"],
];

for (const [pkg, source, target] of files) {
  copyFileSync(
    resolve(here, `../node_modules/@fontsource-variable/${pkg}/files/${source}`),
    resolve(outDir, target),
  );
  console.log(`fonte copiada: ${target}`);
}
