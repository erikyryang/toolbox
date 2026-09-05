import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { OperationSidebar } from "@/components/operation-sidebar";
import { fontVariables } from "@/design/fonts";
import { LanguageProvider, languageBootScript } from "@/lib/language";
import { themeBootScript } from "@/lib/theme";
import { operationsByGroup } from "@/lib/operations/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "toolbox — utilitários de dados e arquivos, no seu navegador",
    template: "%s — toolbox",
  },
  description:
    "Codificação, conversão e compactação de dados e arquivos. Sem contas, sem histórico e sem armazenar nada.",
  applicationName: "toolbox",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontVariables} h-full`} suppressHydrationWarning>
      <head>
        {/*
          Resolve o tema antes da primeira pintura. Sem isto, uma preferência
          escura apareceria depois de um flash de tema claro.
        */}
        <script dangerouslySetInnerHTML={{ __html: languageBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LanguageProvider>
          <SiteHeader />
          <div className="flex min-h-0 flex-1">
            <OperationSidebar groups={operationsByGroup()} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
