/**
 * Copia os arquivos de fonte do pacote @fontsource para src/fonts.
 *
 * As fontes são vendorizadas no repositório de propósito: o build não depende
 * de rede e o navegador nunca pede uma fonte a um domínio de terceiros.
 * Rode `npm run fonts:sync` ao atualizar o pacote de fonte.
 *
 * IBM Plex Mono não tem versão variável publicada, então vem um arquivo por
 * peso. São três — 400 para corpo e dados, 600 para título de seção e rótulo,
 * 700 para título de operação e nome em destaque.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../src/fonts");
mkdirSync(outDir, { recursive: true });

const weights = [400, 600, 700];

for (const weight of weights) {
  const name = `ibm-plex-mono-latin-${weight}-normal.woff2`;
  copyFileSync(
    resolve(here, `../node_modules/@fontsource/ibm-plex-mono/files/${name}`),
    resolve(outDir, `ibm-plex-mono-${weight}.woff2`),
  );
  console.log(`fonte copiada: ibm-plex-mono-${weight}.woff2`);
}
