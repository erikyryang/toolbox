# client-compression Specification

## Purpose
Compactação e extração de arquivos no navegador: formatos oferecidos, presets de nível, execução em Web Worker, guarda anti-bomba e a regra determinística que decide quando a operação precisa sair do navegador.

## Requirements
### Requirement: Compactação client-side
O sistema SHALL compactar arquivos no navegador nos formatos ZIP, GZIP, ZSTD e TAR, usando WASM onde o ganho justifica (ZSTD) e JavaScript onde ele é mais rápido que o WASM disponível (DEFLATE).

Nenhum outro formato SHALL ser oferecido para compactação. RAR e 7Z não têm compressor livre e não aparecem entre as opções de compactar; XZ e BZIP2 saíram do produto.

#### Scenario: Compactar em GZIP
- **WHEN** o usuário seleciona um arquivo dentro do limite client-side na operação GZIP
- **THEN** o arquivo comprimido é produzido no navegador e oferecido para download

#### Scenario: Formatos oferecidos
- **WHEN** a tela de compactação é aberta
- **THEN** os formatos disponíveis são exatamente ZIP, GZIP, ZSTD e TAR

#### Scenario: ZSTD dentro do teto
- **WHEN** o nível ZSTD escolhido está dentro do teto client-side
- **THEN** a compressão acontece no navegador, sem envio ao backend

#### Scenario: Sem envio ao servidor
- **WHEN** a compactação ocorre no navegador
- **THEN** nenhum byte do arquivo é enviado ao backend e o indicador de privacidade mostra processamento local

### Requirement: Descompactação client-side
O sistema SHALL descompactar no navegador os formatos ZIP, TAR e GZIP, listando as entradas do arquivo antes da extração quando o formato for um container.

A leitura de ZSTD SHALL ser encaminhada ao backend: a biblioteca WASM disponível expõe apenas API síncrona, que aloca a saída inteira antes de a guarda anti-bomba poder agir — e uma guarda que só é consultada depois da alocação não protege de nada. RAR e 7Z também SHALL ser encaminhados, por não terem leitor no navegador.

#### Scenario: Listagem de entradas
- **WHEN** um ZIP é aberto na operação de extração
- **THEN** a interface lista nome, tamanho original e tamanho comprimido de cada entrada, sem extrair nada ainda

#### Scenario: Extração de entrada única
- **WHEN** o usuário escolhe uma entrada da listagem
- **THEN** apenas aquela entrada é extraída e oferecida para download

#### Scenario: Fluxo de um só membro
- **WHEN** um `.gz` de arquivo único é fornecido
- **THEN** o conteúdo descomprimido é produzido diretamente, sem etapa de listagem

#### Scenario: Leitura de ZSTD
- **WHEN** um arquivo `.zst` é fornecido para extração
- **THEN** a interface informa, antes de qualquer envio, que a operação usará o servidor e explica que a leitura segura de ZSTD exige o backend

### Requirement: Presets de nível de compressão
O sistema SHALL oferecer os presets Rápido, Balanceado, Máxima e Customizado, mapeados internamente para o range de nível de cada formato (ZSTD 1–22, GZIP 1–9, ZIP 0–9). O mapa de preset para nível SHALL ser explícito por formato, e não proporcional: o custo de subir um nível não é linear em nenhum deles.

#### Scenario: Preset por formato
- **WHEN** o preset Balanceado é escolhido na operação ZSTD
- **THEN** o nível efetivo aplicado está dentro do range 1–22 e é exibido na interface

#### Scenario: Nível customizado
- **WHEN** o preset Customizado é escolhido
- **THEN** um controle permite escolher o nível exato dentro do range válido do formato selecionado

#### Scenario: Nível fora do range
- **WHEN** um nível fora do range do formato é solicitado
- **THEN** a interface impede a seleção e explica o range aceito

#### Scenario: Formato sem nível
- **WHEN** o formato escolhido é TAR, que apenas empacota
- **THEN** nenhum controle de nível é oferecido

#### Scenario: Opções recolhidas por padrão
- **WHEN** a tela de compactação carrega
- **THEN** o controle de nível está atrás do disclosure de opções avançadas, com o preset Balanceado aplicado

### Requirement: Roteamento para o backend por regra determinística
O sistema SHALL decidir entre processar no navegador ou encaminhar ao backend por regras explícitas, avaliadas antes do processamento: formato exige backend (RAR, 7Z e leitura de ZSTD); nível ZSTD acima do teto client-side; ou tamanho de entrada acima do limite configurável.

#### Scenario: Arquivo acima do limite
- **WHEN** o arquivo selecionado excede o limite client-side configurado
- **THEN** a interface informa, antes de qualquer envio, que a operação usará o servidor e explica o motivo

#### Scenario: Formato exclusivo do backend
- **WHEN** um arquivo RAR, 7Z ou ZSTD é selecionado para extração
- **THEN** a operação é encaminhada ao backend e o indicador de privacidade reflete isso

#### Scenario: Dentro dos limites
- **WHEN** o arquivo está abaixo do limite e o formato é suportado no navegador
- **THEN** o processamento ocorre localmente, sem qualquer requisição ao backend

#### Scenario: Limite configurável
- **WHEN** o limite client-side é alterado por configuração de deploy
- **THEN** a decisão de roteamento passa a usar o novo valor, sem alteração de código

#### Scenario: Backend não configurado
- **WHEN** a decisão é `server` e o endereço do backend não está configurado no deploy
- **THEN** a ação é desabilitada com o motivo exibido, e nenhuma requisição é emitida

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
