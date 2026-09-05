# Frontend do Toolbox

Aplicação Next.js para conversão, codificação e compactação de dados. As
operações de texto são processadas no navegador; operações de arquivo são
roteadas ao backend apenas quando o formato, o tamanho ou o nível escolhido
exigem isso.

## Desenvolvimento

```bash
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080 npm run dev
```

O backend é opcional para operações locais. Para formatos roteados ao servidor,
siga as instruções do [README raiz](../README.md).

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
