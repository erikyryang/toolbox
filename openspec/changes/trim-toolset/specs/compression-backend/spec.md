## MODIFIED Requirements

### Requirement: Escopo restrito do backend
O serviço Go SHALL atender apenas os casos fora do alcance do navegador: arquivos acima do limite client-side, leitura de RAR, 7Z e ZSTD, e compressão ZSTD em níveis acima do teto client-side. Operações de encoding e formatação MUST NOT ter endpoints no backend.

#### Scenario: Requisição dentro do escopo
- **WHEN** um arquivo 7Z é enviado ao endpoint de extração
- **THEN** o serviço extrai o conteúdo e responde com o resultado

#### Scenario: Requisição fora do escopo
- **WHEN** uma operação de encoding é solicitada ao backend
- **THEN** o serviço responde com erro, pois não existe endpoint para essa operação

#### Scenario: Formato apenas de leitura
- **WHEN** uma compactação em RAR ou 7Z chega ao serviço
- **THEN** a requisição é recusada com erro explicando que o formato é apenas leitura, por não haver compressor livre

### Requirement: Bibliotecas de compressão adotadas
O backend SHALL usar `klauspost/compress` para ZSTD, GZIP, DEFLATE e ZIP; `bodgit/sevenzip` para leitura de 7Z; e `nwaples/rardecode` para leitura de RAR. Nenhuma outra biblioteca de compressão SHALL ser declarada como dependência direta.

#### Scenario: Descompactação de RAR
- **WHEN** um arquivo RAR é processado
- **THEN** a extração usa `nwaples/rardecode`

#### Scenario: Leitura de ZSTD
- **WHEN** um arquivo ZSTD é enviado para extração
- **THEN** a leitura usa `klauspost/compress`, sob a guarda anti-bomba do serviço

#### Scenario: Compressão ZSTD em nível alto
- **WHEN** um nível ZSTD acima do teto client-side é solicitado
- **THEN** a compressão usa `klauspost/compress` no nível pedido, dentro do range 1–22

### Requirement: Streaming onde o formato permitir
Formatos sequenciais (GZIP, ZSTD, TAR) SHALL ser lidos e processados via `io.Reader`/`io.Writer` com uso de memória constante, sem materializar a entrada inteira.

A **resposta**, porém, MUST NOT ser enviada em streaming estrito: toda compactação e extração SHALL terminar no staging da tmpfs antes do primeiro cabeçalho de resposta. É a troca que garante que uma falha do codec vire erro HTTP legível, e nunca um `200` truncado que o navegador salva como se fosse um arquivo íntegro.

#### Scenario: GZIP de arquivo grande
- **WHEN** um arquivo próximo do limite de requisição é comprimido em GZIP
- **THEN** o consumo de memória do processo permanece em patamar constante, independente do tamanho da entrada

#### Scenario: Saída preparada antes dos cabeçalhos
- **WHEN** a compressão produz saída
- **THEN** os bytes são preparados no staging da tmpfs, e a resposta só começa depois que o resultado está completo

#### Scenario: Falha do codec no meio do trabalho
- **WHEN** o codec falha depois de já ter produzido parte da saída
- **THEN** a resposta é um erro em JSON com o status apropriado, e nenhum byte parcial é entregue como resultado
