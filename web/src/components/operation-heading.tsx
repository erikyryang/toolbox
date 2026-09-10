/**
 * O topo de toda tela de operação: linha de prompt, título e subtítulo.
 *
 * A linha de prompt é ornamento — repete o slug que já está no título e na
 * URL — então sai da árvore de acessibilidade. Um leitor de tela anuncia o
 * título e o subtítulo, e nada mais.
 *
 * Vive em componente próprio porque as duas famílias de tela (texto e
 * arquivo) montam o mesmo cabeçalho, e um cabeçalho duplicado é um cabeçalho
 * que diverge.
 */
export function OperationHeading({
  slug,
  title,
  subtitle,
}: {
  slug: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-xs text-text-muted" aria-hidden>
        you@toolbox:~$ {slug}
      </p>
      <h1 className="text-title font-bold tracking-tight text-text">{title}</h1>
      <p className="max-w-2xl text-sm text-text-muted">{subtitle}</p>
    </header>
  );
}
