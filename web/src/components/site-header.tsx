import Link from "next/link";

import { OperationMenu } from "@/components/operation-menu";
import { LanguageToggle } from "@/components/language-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { operationsByGroup } from "@/lib/operations/catalog";

/** Header fino: marca, navegação móvel e alternador de tema. */
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="flex h-[var(--header-height)] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-text"
        >
          toolbox
        </Link>

        <div className="lg:hidden">
          <OperationMenu groups={operationsByGroup()} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
