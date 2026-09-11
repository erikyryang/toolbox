## Context

O registro importa todos os motores de texto estaticamente. Cada workspace de texto depende do conjunto inteiro, incluindo o parser XML, mesmo quando apenas Base64 é usado. Base inspecionada: main@9fc33af, após fetch e pull por fast-forward.

## Goals / Non-Goals

**Goals:**

- Carregar motores por operação sob demanda, preservando catálogo e rotas estáticas.
- Tratar carregamento, falha e nova tentativa com estado acessível sem executar um motor de rota anterior.
- Validar isolamento de imports e registrar evidência do build antes/depois.

**Non-Goals:** expandir o catálogo de ferramentas, adicionar persistência ou alterar a identidade visual.

## Decisions

Criar loaders explícitos com import() por família de motor, cachear Promises bem-sucedidas e remover falhas do cache para permitir retry. Manter metadados e renderização inicial dos controles independentes do carregamento, evitando perda de SEO ou acessibilidade. Expor execução síncrona após resolver o motor; invalidar resposta de carregamento de slug antigo e resetar estado ao trocar operação. Não mover texto para Worker neste PR. Medir a separação por grafo/chunks de produção, sem impor porcentagem arbitrária de redução.

### Implementação

Os caminhos de `import()` são literais, um por família: caminho montado em tempo de execução faria o empacotador incluir todos os candidatos, que é o oposto do que se quer aqui. A Promise de cada slug é compartilhada entre pedidos — duas montagens da mesma tela não baixam o mesmo chunk duas vezes — e só a rejeição sai do cache, porque é ela que dá ao botão de tentar novamente algo para tentar.

O estado de carregamento vive num controlador fora do React, lido por `useSyncExternalStore`, com uma geração por pedido: resposta de geração vencida é descartada em silêncio, e motor que volta com outro slug é tratado como ausência de motor. A tela monta com `key={slug}`, então trocar de operação recomeça entrada, sentido e opções em vez de misturar o estado de uma com o motor da outra. Enquanto o motor não chega, o resultado é o de entrada vazia — saída em branco, nenhum erro —, para não acusar de inválido quem digitou cedo; o estado aparece em texto, com `role="status"` ao carregar e `role="alert"` mais botão ao falhar.

O vocabulário de unidades saiu de `engines/data-size.ts` para `engines/data-size-units.ts`. O catálogo precisa dos nomes das unidades para montar os dois seletores do conversor, e enquanto eles moravam junto da aritmética, importar o catálogo — o que toda rota faz, inclusive a home — trazia o motor inteiro junto. A lista continua única e derivada de um só lugar; o que se separou foi a tabela do cálculo.

### Evidência de build

`next build` (Turbopack, Next 16.3.4), comparando `main@9fc33af` com esta mudança e lendo os scripts que cada HTML pré-renderizado carrega:

- Antes, um único chunk de 125.545 B — base64, base32, base58, junção de linhas, os formatadores e o `fast-xml-parser` inteiro — estava nos scripts iniciais de toda rota de operação. Um segundo chunk, de 31.046 B, levava o conversor de tamanho junto do catálogo para toda rota e também para a home.
- Depois, cada família tem chunk próprio, e nenhum deles é referenciado por nenhum dos 16 HTML pré-renderizados: formatadores com `fast-xml-parser` 78.148 B, base32/58 1.982 B, conversor de tamanho 1.774 B, junção de linhas 457 B, base64 401 B.
- O JavaScript inicial de uma rota de operação caiu de 762.655 B para 683.448 B (−79.207 B, −10,4%). A home caiu de 639.940 B para 637.943 B e deixou de carregar motor algum.

## Risks / Trade-offs

Chunk indisponível → erro localizado de carregamento e ação de tentar novamente. Corrida entre slugs → isolamento por chave/geração. JSON e XML compartilham structured.ts; decidir a separação do parser com evidência de build e manter testes funcionais.

Resolvido com a evidência acima: JSON e XML continuam no mesmo chunk, porque são o mesmo motor com um argumento diferente, e é esse chunk que carrega o `fast-xml-parser` — 78.148 B que hoje só descem para quem abre uma das duas telas de formatação. Separar o parser do JSON exigiria dois motores em vez de um pivô comum, e o ganho seria para a rota `json-format` apenas; fica como possibilidade, não como parte desta mudança.

Limitação conhecida: `engines/bytes.ts` continua no grafo inicial das 13 rotas de operação, num chunk de 4.898 B, porque `lib/compression/from-text.ts` o importa estaticamente para ler texto colado em base64 e hex. Não é motor de operação de texto — é o utilitário de bytes que a tela de compactação já exigia antes desta mudança —, e tirá-lo de lá dependeria de mexer no carregamento da compactação, que está fora deste PR. Na prática, abrir Base64 não baixa parser de formato nem codec de compactação, mas o alfabeto base64 chega por esse outro caminho.

## Migration Plan

Publicar em PR próprio a partir da main atualizada. Manter a mudança ativa durante revisão; consolidar seus deltas ao integrar. Reversão pelo revert dos commits deste PR. Instalações e dados do usuário não exigem migração.

## Open Questions

Nenhuma decisão de produto pendente. Os detalhes de implementação que se mostraram materiais estão registrados acima. Segue em aberto, para outra mudança: tirar `engines/bytes.ts` do grafo inicial das rotas de operação, o que passa por como a tela de compactação carrega o que ela mesma usa.

