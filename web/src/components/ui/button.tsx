import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botão base, no formato do shadcn/ui mas escrito sobre os tokens semânticos.
 * O acento aparece só nas variantes `primary` e `chip` — nenhuma outra ação o
 * usa.
 *
 * `chip` é o controle do cromo de terminal: caixa alta, tracking de rótulo,
 * borda de 1px, e acento na borda e no texto quando está sob o ponteiro ou
 * marcado com `aria-current`. Os controles que precisam dele já são botões ou
 * links, então ele é variante e não componente próprio — assim herda foco,
 * `disabled` e `asChild` sem repetição.
 *
 * `tab` é o mesmo chip com a tipografia da navegação: caixa como escrita e
 * tracking curto, porque ali o texto é um nome ("eriky-ryan", "blog") e não um
 * rótulo. A altura vem do padding, e não de um `h-*`, para que a caixa case
 * exatamente com a do erikyryan.dev.br.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover",
        outline:
          "border border-border-interactive bg-transparent text-text hover:bg-surface-raised",
        ghost: "bg-transparent text-text-muted hover:bg-surface-raised hover:text-text",
        chip:
          "border border-border bg-transparent text-xs font-normal uppercase tracking-label text-text hover:border-accent hover:text-accent-text aria-[current]:border-accent aria-[current]:text-accent-text [&_svg]:size-3.5",
        tab:
          "border border-border bg-transparent text-xs font-normal normal-case tracking-[0.02em] text-text hover:border-accent hover:text-accent-text aria-[current]:border-accent aria-[current]:text-accent-text [&_svg]:size-3.5",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        chip: "px-2 py-1 leading-normal",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "sm",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
