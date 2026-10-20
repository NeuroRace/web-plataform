"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadMyPrize } from "@/lib/prize-data";
import {
  PRIZE_IDLE_REFRESH_MS,
  PRIZE_REFRESH_MS,
  hasClaimedPrize,
  prizeView,
  visiblePrizes,
  type PrizeRow,
  type PrizeView,
} from "@/lib/prize";
import { cn } from "@/lib/utils";

/**
 * Prêmio da rodada no topo do painel (NEU-171). É o único lugar garantido para quem
 * não recebe e-mail nem WhatsApp.
 *
 * Busca de novo ao voltar para a aba, a cada 30 s enquanto há código valendo e a cada
 * 60 s sem ele (a rodada pode fechar com a pessoa já no painel). Só com a aba visível.
 * Para de buscar sem a função no banco (`enabled` falso) e depois do prêmio retirado.
 * Uma busca que falha mantém o que já estava na tela.
 */
export function PrizeCard({ initial, enabled }: { initial: PrizeRow[]; enabled: boolean }) {
  // A página mantém este estado entre trocas de aba e router.refresh(): dados novos do
  // servidor substituem os antigos (padrão de "informação do render anterior").
  const propsKey = JSON.stringify([initial, enabled]);
  const [seenKey, setSeenKey] = useState(propsKey);
  const [rows, setRows] = useState(initial);
  const [available, setAvailable] = useState(enabled);
  if (seenKey !== propsKey) {
    setSeenKey(propsKey);
    setRows(initial);
    setAvailable(enabled);
  }

  const views = visiblePrizes(rows).map(prizeView).filter(isShown);
  const open = views.some((v) => v.kind === "open");
  const claimed = hasClaimedPrize(rows);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!available || claimed) return;
    const refresh = async () => {
      if (document.visibilityState !== "visible" || inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await loadMyPrize(createClient());
        if (res.ok) setRows(res.rows);
        else if (res.missing) setAvailable(false);
      } catch (err) {
        console.error("get_my_prize: falha inesperada", err);
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
  }, [available, claimed, open]);

  // A região existe mesmo vazia: leitor de tela só anuncia mudança dentro de uma região
  // que já estava na página quando o código chegou.
  return (
    <div aria-live="polite">
      {views.map((view, i) => (
        <PrizeSection key={i} view={view} titleId={`premio-titulo-${i}`} />
      ))}
    </div>
  );
}

type ShownView = Exclude<PrizeView, { kind: "none" }>;

const isShown = (v: PrizeView): v is ShownView => v.kind !== "none";

function PrizeSection({ view, titleId }: { view: ShownView; titleId: string }) {
  const open = view.kind === "open";
  return (
    <section
      aria-labelledby={titleId}
      className={cn("glass-card mt-6 p-5 sm:p-6", open && "glow-attention")}
    >
      {view.kind === "open" ? (
        <>
          <h2 id={titleId} className="font-display text-xl font-bold text-fg-strong sm:text-2xl">
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
          <h2 id={titleId} className="font-display text-lg font-bold text-fg-strong">
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
