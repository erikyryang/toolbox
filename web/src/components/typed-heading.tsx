"use client";

import { useEffect, useState } from "react";

/**
 * O h1 do erikyryan.dev.br trazido para cá: o título aparece caractere a
 * caractere, com um bloco piscante colado no último.
 *
 * A digitação é ornamento, então mora inteira sob `aria-hidden` — o título
 * real fica num span `sr-only` completo desde a primeira pintura, e um leitor
 * de tela nunca o ouve soletrado. O servidor também pinta o título inteiro no
 * span visível: quem não tem JavaScript lê o título parado, e a primeira
 * renderização do cliente é idêntica à do servidor. Só depois de montar é que
 * o efeito zera o texto e começa a digitar.
 */
export function TypedHeading({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [typed, setTyped] = useState(text);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(text);
      return;
    }

    setTyped("");
    let index = 0;
    let timer = window.setTimeout(function step() {
      setTyped(text.slice(0, ++index));
      if (index < text.length) timer = window.setTimeout(step, 45);
    }, 45);

    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    /*
     * A altura mínima reserva a primeira linha antes de o primeiro caractere
     * cair: sem ela, o que vem abaixo do título sobe e desce ao digitar.
     */
    <h1 className={`min-h-[1.25em] ${className ?? ""}`}>
      <span className="sr-only">{text}</span>
      {/*
       * O texto digitado é inline, e não uma caixa própria: assim ele quebra
       * dentro da mesma linha do h1 e o cursor encosta no último caractere.
       * Numa caixa `inline-block`, o cursor viria depois da caixa inteira —
       * e um título que ocupa duas linhas o empurraria sozinho para a
       * terceira. Não há espaço entre os dois spans, então também não há
       * onde quebrar entre o "?" e o cursor.
       */}
      <span aria-hidden>{typed}</span>
      {mounted ? <span aria-hidden className="cursor" /> : null}
    </h1>
  );
}
