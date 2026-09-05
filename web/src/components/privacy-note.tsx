import type { ProcessedOn } from "@/lib/operations/types";

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
  if (processedOn === "client") {
    return (
      <p className="text-xs text-text-muted">
        Processado no seu navegador, nada é enviado.
      </p>
    );
  }

  return (
    <p className="text-xs text-text-muted">
      Processado no servidor{reason ? ` — ${reason}` : ""}. O arquivo é
      descartado assim que a resposta termina; nada é armazenado.
    </p>
  );
}
