import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botão base, no formato do shadcn/ui mas escrito sobre os tokens semânticos.
 * O acento aparece só na variante `primary` — nenhuma outra ação o usa.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover",
        outline:
          "border border-border-interactive bg-transparent text-text hover:bg-surface-raised",
        ghost: "bg-transparent text-text-muted hover:bg-surface-raised hover:text-text",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
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
