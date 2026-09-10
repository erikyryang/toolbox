## Context

A operação cabe inteira no modelo que já existe. `OperationMeta` é dado puro,
o motor é `(input, options) => EngineResult`, a tela de duas colunas recalcula
a cada tecla e o `registry.ts` liga slug a motor. Nada disso precisa mudar
para acomodar um conversor de unidades — o que muda é que o menu ganha uma
quarta seção, e `OperationGroup` é uma união fechada de três strings.

O trabalho de verdade está em três decisões pequenas e chatas: como
representar a escada de unidades sem perder precisão, o que a base significa
exatamente em cada degrau, e como formatar um número que veio de aritmética
binária sem entregar `1023.9999999999999`.

## Goals / Non-Goals

**Goals:**

- Converter entre bit, byte, KB, MB, GB e TB com a base visível e escolhida.
- Um campo de valor que só aceita valor: uma linha, caractere numérico, e a
  unidade vindo dos seletores.
- Saída colável em outra ferramenta, sem separador de milhar nem cauda de
  ponto flutuante.
- Errar de forma legível, como todo motor do repositório.

**Non-Goals:**

- Taxa de transferência. `Mbps` é bit por segundo, unidade de outra grandeza;
  entra como operação própria se algum dia entrar.
- Petabyte e acima, e as unidades de bit escaladas (`kbit`, `Mbit`). A escada
  pedida vai até TB, e bit fica como degrau atômico.
- Formatação por locale. O separador decimal é sempre ponto, de propósito.

## Decisions

### Bit é a unidade canônica, e o fator entra em inteiros

Toda conversão passa por bits: `bit = 1`, `byte = 8`, e cada degrau acima
multiplica por `base` elevado à posição. Um único fator por unidade, e a
conversão é `valor * fatorOrigem / fatorDestino`.

Os fatores são calculados com `Math.pow` sobre inteiros e permanecem exatos: o
maior deles, TB na base 1024, é `8 * 2⁴⁰` ≈ 8.8 × 10¹², bem abaixo de
`Number.MAX_SAFE_INTEGER`. Não há motivo para `BigInt` — ele só moveria o
problema de precisão para a formatação, já que a entrada pode ser fracionária.

*Alternativa descartada*: tabela de conversão par a par. Trinta e seis
entradas para manter em dia contra seis fatores.

### A base padrão é 1024

É a convenção que o sistema operacional reporta, e portanto a que a pessoa
tem na tela quando vem conferir por que o disco de 1 TB tem 931 de alguma
coisa. Padrão 1000 responderia a pergunta errada primeiro.

### Os degraus se chamam KB, MB, GB e TB nos dois modos

Renomear os rótulos para KiB/MiB/GiB/TiB quando a base é 1024 seria mais
correto na letra e pior na prática: as opções do catálogo são dados
estáticos, traduzidos por tabela, e um rótulo que muda com o valor de outra
opção não passa por esse caminho sem gambiarra.

A correção vem pela nota da saída, que diz qual base foi aplicada e qual é o
nome IEC do degrau. `EngineResult` já admite `{ output, notes }`, e a tela já
renderiza notas abaixo do painel — o mecanismo existe e é usado por outras
operações para exatamente este tipo de aviso.

### O campo é estritamente numérico, e por isso o motor ficou menor

A entrada de um conversor é um valor. Uma área de texto multilinha para
digitar `1.5` promete linhas, colagem de parágrafo e unidade escrita junto —
liberdade que a operação não tem como honrar sem inventar regras de leitura.

O campo é `type="text"` com `inputMode="decimal"`, e não `type="number"`: o
número nativo trata a vírgula decimal de forma inconsistente entre locales, e
o produto começa em português, onde é a vírgula que se digita. O filtro é uma
função pura, `sanitizeNumeric`, aplicada no `onChange` de um campo controlado
— a tecla que não pode entrar simplesmente não aparece.

Recusar na digitação, e não depois por mensagem, é a escolha que importa:
quem digita uma letra num campo de valor não cometeu um engano que mereça uma
mensagem vermelha, apenas errou a tecla.

Como consequência, o motor perdeu a tabela de sinônimos de unidade e a leitura
linha a linha: nenhuma das duas tem como ser alcançada pela interface, e
código inalcançável é código que mente sobre o que o produto faz. A unidade
passa a vir exclusivamente dos seletores.

### Digitar é um processo, e nem toda tecla intermediária é falha

`""`, `"-"`, `"."` e `"-."` não são números, mas também não são erro: são a
metade do caminho até um. O motor devolve saída vazia para esses estados, e só
erra com o que não pode virar número por nenhum caminho. Sem isso, a mensagem
de erro piscaria a cada primeiro caractere de um valor negativo ou decimal.

### O sentido inverso troca origem e destino

`engines.reverse` é o mesmo motor com as duas opções invertidas. Isso dá, de
graça, o comportamento que a tela já implementa: trocar de sentido promove a
saída a entrada, então converter 1.5 GB → 1536 MB e inverter devolve
1536 MB → 1.5 GB, fechando o ciclo.

### Formatação: 12 dígitos significativos e poda

`toPrecision(12)` mata a cauda binária sem truncar nada que importe — 0.1 GB
em MB dá `102.4`, não `102.39999999999999`. O resultado passa por uma poda de
zeros à direita e de notação exponencial, para que a saída seja sempre um
número em notação posicional, sem separador de milhar.

Números grandes o bastante para que `toPrecision` produza expoente
(acima de 10¹²) são reconvertidos por `toFixed`, porque `8.8e+12` não cola em
lugar nenhum.

## Risks / Trade-offs

- **Valores absurdamente grandes perdem precisão** → acima de 2⁵³ bits a
  aritmética de ponto flutuante deixa de ser exata. É ~1 PB em bits; fora da
  escada oferecida. Se PB entrar depois, esta conta precisa ser refeita.

- **Não dá mais para colar `1.5 GB` de um relatório** → é o custo do campo
  estritamente numérico, e foi decidido assim de propósito. Quem cola um valor
  com unidade cola o número e escolhe a unidade no seletor, que é uma
  interação a mais em troca de um campo que não aceita lixo.

- **Uma quarta seção no menu com um item só** → é o custo de a operação não
  pertencer a nenhuma das três existentes. Forçá-la em "Formato" faria o menu
  mentir sobre o que aquele grupo é.

## Open Questions

Nenhuma. A leitura de `tr` como TB foi assumida a partir da escada citada
(bit, byte, MB, GB) e declarada na entrega; KB entrou por ser o degrau que
faltava entre byte e MB. O nome da operação e a estritura do campo foram
decididos pelo autor depois da primeira entrega, e os artefatos acima já
refletem essas duas escolhas.
