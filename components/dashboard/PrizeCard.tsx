"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadMyPrize } from "@/lib/prize-data";
import { PRIZE_REFRESH_MS, pickPrize, prizeView, type PrizeRow } from "@/lib/prize";
import { useNow } from "@/components/ranking/useLiveRanking";
import { cn } from "@/lib/utils";

/**
 * Prêmio da rodada no topo do painel (NEU-171). É o único lugar garantido para quem
 * não recebe e-mail nem WhatsApp. Enquanto o código vale, busca de novo a cada 30 s
 * (só com a aba visível); uma busca que falha mantém o que já estava na tela.
 */
export function PrizeCard({ initial }: { initial: PrizeRow | null }) {
  const [prize, setPrize] = useState(initial);
  const now = useNow(PRIZE_REFRESH_MS);
  const view = prizeView(prize, now);
  const open = view.kind === "open";

  useEffect(() => {
    if (!open) return;
    const poll = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const rows = await loadMyPrize(createClient());
      if (rows) setPrize(pickPrize(rows));
    }, PRIZE_REFRESH_MS);
    return () => clearInterval(poll);
  }, [open]);

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
              <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-attention tabular-nums">
                {view.code}
              </p>
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
            <p className="mt-4 text-sm text-meditation">
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
