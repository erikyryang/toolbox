
import { message } from "@/lib/messages";
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
}: {
  processedOn: ProcessedOn;
  reason?: string;
}) {
  const { language } = useLanguage();
  if (processedOn === "client") {
    return (
      <p className="text-xs text-text-muted">
        {message(language, "ui.privacyLocal")}
      </p>
    );
  }

  return (
    <p className="text-xs text-text-muted">
      {message(language, "privacy.server")}
    </p>
  );
}
