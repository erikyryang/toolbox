import type { ProcessedOn } from "@/lib/operations/types";
import { useLanguage } from "@/lib/language";

/**
 * Aviso de privacidade do rodapé da operação.
 *
 * Recebe o `processedOn` do próprio resultado da operação — não um palpite da
 * interface. Quando o processamento for para o servidor, o texto muda junto,
 * porque não existe caminho em que um exista sem o outro.
 */
export function PrivacyNote({
  processedOn,
  reason,
}: {
  processedOn: ProcessedOn;
  reason?: string;
}) {
  const { language } = useLanguage();
  if (processedOn === "client") {
    return (
      <p className="text-xs text-text-muted">
        {language === "pt" ? "Processado no seu navegador, nada é enviado." : "Processed in your browser. Nothing is sent."}
      </p>
    );
  }

  return (
    <p className="text-xs text-text-muted">
      {language === "pt"
        ? <>Processado no servidor{reason ? ` — ${reason}` : ""}. O arquivo é descartado assim que a resposta termina; nada é armazenado.</>
        : <>Processed on the server{reason ? ` — ${reason}` : ""}. The file is discarded as soon as the response ends; nothing is stored.</>}
    </p>
  );
}
