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
- Aceitar o valor como a pessoa o encontra no mundo — `1.5 GB`, `900mb`,
  `64 KiB` — e não só como número nu.
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

### O sufixo da entrada vence a seleção

Quem cola `1.5 GB` de um relatório não quer ajustar um seletor antes. O parser
lê `número + unidade opcional`; quando a unidade está lá, ela manda naquela
linha. As formas IEC são aceitas como sinônimo do degrau — `KiB` é `KB` com a
base já implícita, e como a base é escolhida à parte, tratá-las como sinônimo
é o que evita duas fontes de verdade discordando.

*Consequência aceita*: `64 KiB` com base 1000 selecionada converte como 64 KB
decimal. A nota diz qual base foi aplicada, então o resultado não é
silenciosamente errado — é explicitamente o que a opção pediu.

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

- **`KiB` com base 1000 é uma contradição que a ferramenta aceita** →
  mitigado pela nota obrigatória na saída, que declara a base aplicada. A
  alternativa — recusar a combinação — transformaria um mal-entendido em
  erro, e a pessoa não teria como saber o que a ferramenta queria.

- **Uma quarta seção no menu com um item só** → é o custo de a operação não
  pertencer a nenhuma das três existentes. Forçá-la em "Formato" faria o menu
  mentir sobre o que aquele grupo é.

## Open Questions

Nenhuma. A leitura de `tr` como TB foi assumida a partir da escada citada
(bit, byte, MB, GB) e declarada na entrega; KB entrou por ser o degrau que
faltava entre byte e MB.
