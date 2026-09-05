## ADDED Requirements

### Requirement: Escopo restrito do backend
O serviço Go SHALL atender apenas os casos fora do alcance do navegador: arquivos acima do limite client-side, leitura de RAR e 7Z, compressão em XZ e BZIP2 (que não têm compressor no navegador) e compressão ZSTD em níveis acima do teto client-side. Operações de encoding, conversão e formatação MUST NOT ter endpoints no backend.

#### Scenario: Requisição dentro do escopo
- **WHEN** um arquivo 7Z é enviado ao endpoint de descompactação
- **THEN** o serviço extrai o conteúdo e responde com o resultado

#### Scenario: Requisição fora do escopo
- **WHEN** uma operação de encoding é solicitada ao backend
- **THEN** o serviço responde com erro, pois não existe endpoint para essa operação

### Requirement: Bibliotecas de compressão adotadas
O backend SHALL usar `klauspost/compress` para ZSTD, GZIP, DEFLATE e ZIP; `bodgit/sevenzip` para leitura de 7Z; e `nwaples/rardecode` para leitura de RAR. XZ SHALL usar `ulikunitz/xz` e BZIP2 SHALL usar `dsnet/compress/bzip2`, porque `klauspost/compress` não implementa nenhum dos dois.

#### Scenario: Descompactação de RAR
- **WHEN** um arquivo RAR é processado
- **THEN** a extração usa `nwaples/rardecode`

#### Scenario: XZ e BZIP2
- **WHEN** um arquivo XZ ou BZIP2 é comprimido ou descomprimido
- **THEN** a operação usa `ulikunitz/xz` ou `dsnet/compress/bzip2`, respectivamente

#### Scenario: Compressão ZSTD em nível alto
- **WHEN** um nível ZSTD acima do teto client-side é solicitado
- **THEN** a compressão usa `klauspost/compress` no nível pedido, dentro do range 1–22

#### Scenario: Compressão em XZ ou BZIP2
- **WHEN** uma compactação em XZ ou BZIP2 chega ao serviço
- **THEN** ela é atendida em streaming, porque estes formatos só têm compressor no backend

### Requirement: Streaming onde o formato permitir
Formatos sequenciais (GZIP, ZSTD, XZ, BZIP2, TAR) SHALL ser processados via `io.Reader`/`io.Writer` com uso de memória constante, sem materializar a entrada inteira.

#### Scenario: GZIP de arquivo grande
- **WHEN** um arquivo próximo do limite de requisição é comprimido em GZIP
- **THEN** o consumo de memória do processo permanece em patamar constante, independente do tamanho da entrada

#### Scenario: Escrita em streaming
- **WHEN** a compressão produz saída
- **THEN** os bytes são escritos no corpo da resposta conforme são gerados, sem bufferizar o resultado completo

### Requirement: Buffer limitado para formatos com índice no final
Formatos que exigem acesso aleatório (ZIP, RAR, 7Z) SHALL usar buffer em memória até `MEM_BUFFER_MAX`; acima disso e até `REQUEST_MAX_BYTES`, SHALL usar arquivo em tmpfs criado e imediatamente removido do diretório, mantido apenas pelo descritor aberto.

#### Scenario: Entrada pequena permanece em memória
- **WHEN** um ZIP menor que `MEM_BUFFER_MAX` é enviado
- **THEN** ele é processado em memória, sem tocar o filesystem

#### Scenario: Entrada grande usa tmpfs com unlink imediato
- **WHEN** um 7Z maior que `MEM_BUFFER_MAX` e menor que `REQUEST_MAX_BYTES` é enviado
- **THEN** o arquivo temporário é criado em tmpfs e removido do diretório imediatamente após a criação, permanecendo acessível apenas pelo descritor

#### Scenario: Encerramento abrupto
- **WHEN** o processo é encerrado abruptamente durante o processamento
- **THEN** nenhum arquivo temporário permanece acessível, pois o inode já estava sem nome

#### Scenario: Nada em disco persistente
- **WHEN** o processamento termina, com sucesso ou erro
- **THEN** nenhum conteúdo de usuário existe em qualquer sistema de arquivos persistente

### Requirement: Limite de tamanho por requisição
O serviço SHALL rejeitar requisições cujo corpo exceda `REQUEST_MAX_BYTES`, antes de consumir o conteúdo.

#### Scenario: Corpo acima do limite
- **WHEN** o corpo da requisição ultrapassa `REQUEST_MAX_BYTES`
- **THEN** o serviço responde `413` e interrompe a leitura, sem armazenar o que já chegou

#### Scenario: Limite configurável
- **WHEN** `REQUEST_MAX_BYTES` é alterado na configuração
- **THEN** o novo limite passa a valer sem alteração de código

### Requirement: Timeout por requisição
Toda requisição SHALL ter um deadline; ao expirar, o processamento é cancelado e os recursos liberados.

#### Scenario: Operação demorada
- **WHEN** o processamento excede o timeout configurado
- **THEN** o contexto é cancelado, a resposta indica o timeout e todos os buffers e descritores são liberados

### Requirement: Semáforo de concorrência
Operações caras SHALL ser limitadas por um semáforo de concorrência dimensionado pela capacidade do serviço.

#### Scenario: Saturação
- **WHEN** o número de operações simultâneas atinge o teto do semáforo
- **THEN** novas requisições aguardam até o prazo de aquisição e, ao não obtê-lo, recebem `503` com `Retry-After`

#### Scenario: ZSTD em nível máximo
- **WHEN** várias requisições de ZSTD nível 22 chegam ao mesmo tempo
- **THEN** o semáforo impede que o consumo de memória agregado ultrapasse o orçamento do serviço

### Requirement: Rate limiting
O serviço SHALL aplicar rate limiting por origem, respondendo `429` quando o limite é ultrapassado.

#### Scenario: Excesso de requisições
- **WHEN** uma origem ultrapassa a taxa configurada
- **THEN** o serviço responde `429` com `Retry-After`, sem processar o conteúdo enviado

### Requirement: Acesso a partir do frontend
O serviço SHALL liberar por CORS apenas as origens configuradas explicitamente. Sem configuração, nenhuma origem cruzada MUST ser aceita.

#### Scenario: Origem configurada
- **WHEN** o frontend configurado faz uma requisição
- **THEN** a resposta traz `Access-Control-Allow-Origin` com essa origem e `Vary: Origin`

#### Scenario: Origem desconhecida
- **WHEN** uma página não configurada tenta chamar o serviço
- **THEN** nenhum cabeçalho de liberação é emitido e o navegador bloqueia a resposta

### Requirement: Erros legíveis, sem eco de conteúdo
Mensagens de erro SHALL descrever a causa em termos de formato e limite, e MUST NOT incluir nome de arquivo, trecho de conteúdo ou caminho interno.

#### Scenario: Arquivo corrompido
- **WHEN** o arquivo enviado está corrompido
- **THEN** a resposta descreve a falha de formato sem citar nome de arquivo nem trechos do conteúdo

#### Scenario: Formato criptografado
- **WHEN** um 7Z ou RAR protegido por senha é enviado
- **THEN** o serviço responde informando que arquivos criptografados não são suportados
