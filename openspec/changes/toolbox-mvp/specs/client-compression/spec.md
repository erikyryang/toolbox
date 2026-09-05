## ADDED Requirements

### Requirement: Compactação client-side
O sistema SHALL compactar arquivos no navegador nos formatos ZIP, GZIP, ZSTD e TAR, além das combinações tar.gz e tar.zst, usando WASM onde o ganho justifica (ZSTD) e JavaScript onde ele é mais rápido que o WASM disponível (DEFLATE).

A compactação em XZ e BZIP2 SHALL ser encaminhada ao backend: não existe compressor mantido desses dois formatos que rode no navegador. A **descompactação** de XZ e BZIP2 permanece client-side.

#### Scenario: Compactar em GZIP
- **WHEN** o usuário seleciona um arquivo dentro do limite client-side na operação GZIP
- **THEN** o arquivo comprimido é produzido no navegador e oferecido para download

#### Scenario: Combinação tar.zst
- **WHEN** a operação tar.zst é escolhida
- **THEN** o conteúdo é primeiro empacotado em TAR e depois comprimido em ZSTD, resultando em um único arquivo

#### Scenario: Compactação em XZ ou BZIP2
- **WHEN** o usuário escolhe compactar em XZ ou BZIP2
- **THEN** a interface informa, antes de qualquer envio, que a operação usará o servidor e explica que não há compressor desses formatos no navegador

#### Scenario: Sem envio ao servidor
- **WHEN** a compactação ocorre no navegador
- **THEN** nenhum byte do arquivo é enviado ao backend e o indicador de privacidade mostra processamento local

### Requirement: Descompactação client-side
O sistema SHALL descompactar no navegador os formatos ZIP, TAR, GZIP, ZSTD, XZ e BZIP2, listando as entradas do arquivo antes da extração quando o formato for um container.

#### Scenario: Listagem de entradas
- **WHEN** um ZIP é aberto na operação de descompactação
- **THEN** a interface lista nome, tamanho original e tamanho comprimido de cada entrada, sem extrair nada ainda

#### Scenario: Extração de entrada única
- **WHEN** o usuário escolhe uma entrada da listagem
- **THEN** apenas aquela entrada é extraída e oferecida para download

#### Scenario: Fluxo de um só membro
- **WHEN** um `.gz` de arquivo único é fornecido
- **THEN** o conteúdo descomprimido é produzido diretamente, sem etapa de listagem

### Requirement: Presets de nível de compressão
O sistema SHALL oferecer os presets Rápido, Balanceado, Máxima e Customizado, mapeados internamente para o range de nível de cada formato (ZSTD 1–22, GZIP 1–9, XZ 0–9).

#### Scenario: Preset por formato
- **WHEN** o preset Balanceado é escolhido na operação ZSTD
- **THEN** o nível efetivo aplicado está dentro do range 1–22 e é exibido na interface

#### Scenario: Nível customizado
- **WHEN** o preset Customizado é escolhido
- **THEN** um controle permite escolher o nível exato dentro do range válido do formato selecionado

#### Scenario: Nível fora do range
- **WHEN** um nível fora do range do formato é solicitado
- **THEN** a interface impede a seleção e explica o range aceito

#### Scenario: Opções recolhidas por padrão
- **WHEN** a tela de compactação carrega
- **THEN** o controle de nível está atrás do disclosure de opções avançadas, com o preset Balanceado aplicado

### Requirement: Roteamento para o backend por regra determinística
O sistema SHALL decidir entre processar no navegador ou encaminhar ao backend por regras explícitas, avaliadas antes do processamento: formato exige backend (RAR, 7Z); nível ZSTD acima do teto client-side; ou tamanho de entrada acima do limite configurável.

#### Scenario: Arquivo acima do limite
- **WHEN** o arquivo selecionado excede o limite client-side configurado
- **THEN** a interface informa, antes de qualquer envio, que a operação usará o servidor e explica o motivo

#### Scenario: Formato exclusivo do backend
- **WHEN** um arquivo RAR ou 7Z é selecionado
- **THEN** a operação é encaminhada ao backend e o indicador de privacidade reflete isso

#### Scenario: Dentro dos limites
- **WHEN** o arquivo está abaixo do limite e o formato é suportado no navegador
- **THEN** o processamento ocorre localmente, sem qualquer requisição ao backend

#### Scenario: Limite configurável
- **WHEN** o limite client-side é alterado por configuração de deploy
- **THEN** a decisão de roteamento passa a usar o novo valor, sem alteração de código

### Requirement: Processamento fora da main thread
Compactação e descompactação SHALL ser executadas em Web Worker, mantendo a interface responsiva e permitindo cancelamento.

#### Scenario: Interface responsiva
- **WHEN** um arquivo grande está sendo comprimido no navegador
- **THEN** a interface continua respondendo a interações e exibe indicação de progresso ou atividade

#### Scenario: Cancelamento
- **WHEN** o usuário cancela uma operação em andamento
- **THEN** o worker é encerrado, a memória do buffer é liberada e nenhum resultado parcial é apresentado como completo

### Requirement: Proteção contra bomba de descompressão
O sistema SHALL abortar a extração quando o total de bytes de saída ultrapassar o teto configurado, ou quando a razão de expansão ultrapassar o limite configurado **e** a saída já tiver passado de um piso absoluto. A razão isolada MUST NOT abortar a extração: dado honesto e repetitivo passa de 300× sem ser bomba.

#### Scenario: Razão de expansão excessiva
- **WHEN** a extração passa do piso absoluto de saída e ultrapassa a razão máxima de expansão
- **THEN** a operação é abortada e um erro inline explica que o arquivo parece ser uma bomba de descompressão

#### Scenario: Arquivo honesto muito compressível
- **WHEN** um arquivo pequeno e muito repetitivo se expande acima da razão máxima, mas abaixo do piso absoluto de saída
- **THEN** a extração conclui normalmente

#### Scenario: Teto de bytes de saída
- **WHEN** o total extraído atinge o teto configurado
- **THEN** a extração para e o usuário é informado do limite alcançado

### Requirement: Erro claro para formato não suportado
Quando o formato de entrada não é reconhecido ou não é suportado, o sistema SHALL exibir um erro inline nomeando o formato detectado. Saída parcial MUST NOT ser apresentada como resultado completo.

#### Scenario: Formato desconhecido
- **WHEN** um arquivo com assinatura não reconhecida é fornecido
- **THEN** um erro inline informa que o formato não foi identificado

#### Scenario: Variante não suportada
- **WHEN** o formato é reconhecido mas usa uma variante não suportada (ex.: entrada criptografada)
- **THEN** o erro inline nomeia a limitação específica
