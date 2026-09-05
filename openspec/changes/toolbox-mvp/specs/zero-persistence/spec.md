## ADDED Requirements

### Requirement: Nenhuma persistência de conteúdo de usuário
Nenhum arquivo, entrada ou saída de usuário SHALL ser gravado em disco persistente, banco de dados, fila, cache ou CDN, em nenhum ponto do sistema.

#### Scenario: Auditoria de dependências
- **WHEN** as dependências do backend são auditadas
- **THEN** não há client de banco de dados, cache ou fila de mensagens no módulo

#### Scenario: Após uma operação de backend
- **WHEN** uma operação de compressão no backend termina
- **THEN** nenhum vestígio da entrada ou da saída permanece acessível no sistema de arquivos ou em qualquer armazenamento

#### Scenario: Uso exclusivo de tmpfs
- **WHEN** um arquivo temporário é necessário
- **THEN** ele é criado em tmpfs, removido do diretório imediatamente após a criação, e nunca em volume persistente

### Requirement: Ausência de contas e histórico
O sistema MUST NOT oferecer contas de usuário, autenticação, histórico de operações ou qualquer mecanismo de retomada de trabalho anterior.

#### Scenario: Nenhum cadastro
- **WHEN** um usuário acessa qualquer operação
- **THEN** a operação está disponível imediatamente, sem login ou cadastro

#### Scenario: Nova sessão
- **WHEN** o usuário recarrega a página
- **THEN** entradas e saídas anteriores não são restauradas

#### Scenario: Preferência de tema é exceção
- **WHEN** o usuário escolheu um tema manualmente
- **THEN** apenas essa preferência é guardada localmente no navegador; nenhum conteúdo de operação é armazenado

### Requirement: Cabeçalhos que impedem cache
Toda resposta que trafegue conteúdo de usuário SHALL incluir `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache` e `Expires: 0`, aplicados por middleware em todas as rotas de operação.

#### Scenario: Resposta de compressão
- **WHEN** o backend responde com um arquivo comprimido
- **THEN** os cabeçalhos de no-store, no-cache e Pragma estão presentes

#### Scenario: Cobertura por middleware
- **WHEN** um novo endpoint que trafega conteúdo é adicionado
- **THEN** os cabeçalhos são aplicados automaticamente pelo middleware, sem depender do handler

### Requirement: Container com filesystem read-only
O container do backend SHALL rodar com o sistema de arquivos raiz em modo somente leitura; a única montagem gravável permitida é a tmpfs de spool, com `noexec` e `nosuid`.

#### Scenario: Tentativa de escrita fora da tmpfs
- **WHEN** o processo tenta escrever fora da montagem de spool
- **THEN** a escrita falha por restrição do sistema de arquivos

#### Scenario: Configuração do deploy
- **WHEN** o manifesto de implantação é inspecionado
- **THEN** ele declara o filesystem raiz como somente leitura e a tmpfs com tamanho limitado, `noexec` e `nosuid`

### Requirement: Logs apenas com metadados
Logs SHALL conter apenas metadados operacionais — operação, formato, bytes de entrada e saída, nível, duração e status. Nome de arquivo, conteúdo de usuário e trechos de entrada MUST NOT ser registrados.

#### Scenario: Log de operação bem-sucedida
- **WHEN** uma operação de backend termina com sucesso
- **THEN** a linha de log contém formato, tamanhos, nível e duração, e nenhum nome de arquivo ou conteúdo

#### Scenario: Log de erro
- **WHEN** uma operação falha
- **THEN** o log registra o tipo de erro e os metadados, sem trechos da entrada

#### Scenario: Estrutura impede vazamento
- **WHEN** o tipo do evento de log é inspecionado
- **THEN** ele não possui campo capaz de carregar nome de arquivo ou conteúdo

### Requirement: Nenhum trânsito para terceiros
Conteúdo de usuário MUST NOT ser enviado a serviços de terceiros, incluindo analytics, monitoramento de erros com captura de payload, CDNs de fonte e serviços externos de processamento.

#### Scenario: Rotas de operação sem analytics de terceiros
- **WHEN** uma rota de operação é carregada
- **THEN** nenhum script de terceiros com acesso ao conteúdo dos painéis é executado

#### Scenario: Fontes locais
- **WHEN** a aplicação carrega suas fontes
- **THEN** elas vêm do próprio domínio, sem requisição a CDN externa

### Requirement: Transparência sobre o local de processamento
O sistema SHALL informar ao usuário, em cada operação, se o processamento ocorre no navegador ou no servidor, e essa informação SHALL derivar da mesma decisão que determina o roteamento.

#### Scenario: Fonte única da verdade
- **WHEN** o indicador de privacidade é renderizado
- **THEN** ele lê o local de processamento do mesmo resultado que executou ou roteou a operação

#### Scenario: Divergência impossível
- **WHEN** uma operação é encaminhada ao backend
- **THEN** não existe caminho de código que mantenha o indicador em "processado no seu navegador"
