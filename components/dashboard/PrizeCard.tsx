"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadMyPrize } from "@/lib/prize-data";
import {
  PRIZE_IDLE_REFRESH_MS,
  PRIZE_REFRESH_MS,
  pickPrize,
  prizeView,
  type PrizeRow,
} from "@/lib/prize";
import { useNow } from "@/components/ranking/useLiveRanking";
import { cn } from "@/lib/utils";

/**
 * Prêmio da rodada no topo do painel (NEU-171). É o único lugar garantido para quem
 * não recebe e-mail nem WhatsApp.
 *
 * Busca de novo ao voltar para a aba, a cada 30 s enquanto o código vale e a cada 60 s
 * sem ele: a rodada pode fechar com a pessoa já no painel. Só com a aba visível. Uma
 * busca que falha mantém o que já estava na tela. `enabled` falso (função ainda não
 * publicada) desliga tudo.
 */
export function PrizeCard({ initial, enabled }: { initial: PrizeRow | null; enabled: boolean }) {
  const [prize, setPrize] = useState(initial);
  const [available, setAvailable] = useState(enabled);
  const now = useNow(PRIZE_REFRESH_MS);
  const view = prizeView(prize, now);
  const open = view.kind === "open";
  const inFlight = useRef(false);

  useEffect(() => {
    if (!available) return;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await loadMyPrize(createClient());
        if (res.ok) setPrize(pickPrize(res.rows));
        else if (res.missing) setAvailable(false);
      } finally {
        inFlight.current = false;
      }
    };
    const poll = setInterval(refresh, open ? PRIZE_REFRESH_MS : PRIZE_IDLE_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [available, open]);

  if (view.kind === "none") return null;

  return (
    <section
      aria-labelledby="premio-titulo"
      aria-live="polite"
      className={cn("glass-card mt-6 p-5 sm:p-6", open && "glow-attention")}
    >
      {view.kind === "open" ? (
        <>
          <h2 id="premio-titulo" className="font-display text-xl font-bold text-fg-strong sm:text-2xl">
            Você venceu a {view.round}!
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-fg-muted">Código de retirada</p>
              {/* Leitor de tela lê "482913" como número; a versão escondida vai dígito a dígito. */}
              <p
                aria-hidden="true"
                className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-attention tabular-nums"
              >
                {view.code}
              </p>
              <p className="sr-only">{view.code.split("").join(" ")}</p>
            </div>
            {!view.late && (
              <p className="text-sm text-fg">
                {view.deadline
                  ? `Mostre no estande do NeuroRace até ${view.deadline}.`
                  : "Mostre este código no estande do NeuroRace."}
              </p>
            )}
          </div>
          {view.late && (
            <p className="mt-4 text-sm font-semibold text-fg-strong">
              {view.deadline ? `O prazo era ${view.deadline}. ` : ""}
              Vá ao estande agora: o código vale até o prêmio passar para o próximo colocado.
            </p>
          )}
        </>
      ) : (
        <>
          <h2 id="premio-titulo" className="font-display text-lg font-bold text-fg-strong">
            Prêmio da {view.round}
          </h2>
          <p className="mt-1 text-sm text-fg">
            {view.kind === "delivered"
              ? `Prêmio retirado${view.at ? ` às ${view.at}` : ""}. Parabéns!`
              : "O prêmio passou para o próximo colocado. Seu resultado continua no ranking."}
          </p>
        </>
      )}
    </section>
  );
}
