## 1. Implementação e validação

- [x] 1.1 Adicionar configuração e dependências Playwright com scripts reproduzíveis.
- [x] 1.2 Cobrir conversão/navegação e alternância de idioma por comportamento visível.
- [x] 1.3 Cobrir round trip de arquivos em Worker e integração com backend Go real.
- [x] 1.4 Adicionar workflows para frontend, backend, specs e E2E com permissões mínimas.
- [x] 1.5 Documentar comandos, portas, fixtures e variáveis exclusivas de teste.
- [x] 1.6 Executar testes locais, lint, typecheck, build, go test e validação OpenSpec.

## Evidências de validação

- `npm ci --offline`, lint e typecheck concluídos.
- Vitest: 283 testes em 15 arquivos aprovados.
- Playwright: cinco testes aprovados contra build de produção, Chromium real,
  Worker real e backend Go real. ZIP local e servidor preservaram todos os bytes.
- Navegação por links internos de compactar para descompactar e de volta limpa
  seleção e resultados e mantém os controles corretos; cenário passou também na
  base anterior à refatoração do ciclo de vida de arquivos.
- `go test ./...`: seis pacotes aprovados; `go mod verify` aprovado.
- OpenSpec `validate --all --strict --no-interactive`: 12 itens aprovados.
- Workflow validado com actionlint 1.7.11; execução no GitHub depende da publicação do PR.
- Ambiente local: macOS arm64, Node 26.7.0 e Go 1.27.1. CI usa Ubuntu 24.04 e
  Go 1.25.1 declarado em `go.mod`; esse runner não foi simulado localmente.
- O sandbox bloqueou portas no primeiro build; a execução autorizada fora dele
  passou após isolar o cache de erro. Não houve alteração de código de produção.
