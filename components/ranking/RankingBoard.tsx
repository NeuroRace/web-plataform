"use client";

import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/metrics";
import {
  RANKING_REFRESH_MS,
  TELAO_LIMIT,
  formatRemaining,
  formatWindowRange,
} from "@/lib/ranking";
import { loadRanking, type Board, type RankingSnapshot } from "@/lib/ranking-data";
import { site } from "@/lib/site";
import {
  BoardContent,
  LiveStatus,
  PreviousWinner,
  RoundHeader,
  Tabs,
  TelaoControls,
  type RankingTab,
} from "./RankingBoardParts";

export type { RankingTab };
type Mode = "page" | "telao";

/**
 * Ranking ao vivo (NEU-111): abas Evento / Rodada atual e modo telão.
 * Recebe o primeiro snapshot do servidor e busca de novo a cada 15 s no browser.
 * Se uma atualização falhar, mantém os últimos dados e avisa, em vez de apagar a tela.
 */
export function RankingBoard({
  initial,
  mode = "page",
  highlight = null,
  initialTab,
}: {
  initial: RankingSnapshot;
  mode?: Mode;
  highlight?: string | null;
  initialTab?: RankingTab;
}) {
  const telao = mode === "telao";
  const [snap, setSnap] = useState(initial);
  // Snapshot do servidor já incompleto: avisa desde o início.
  const [stale, setStale] = useState(initial.failed);
  const [tab, setTab] = useState<RankingTab>(
    initialTab ?? (initial.windows?.current ? "rodada" : "evento"),
  );
  // Relógio só depois de montar: evita divergência de hidratação no "faltam X".
  const [now, setNow] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const hadRound = useRef(Boolean(initial.windows?.current));

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await loadRanking(createClient(), new Date(), {
        limit: telao ? TELAO_LIMIT : undefined,
      });
      // Qualquer busca falhou (rodadas, evento, rodada ou vencedor): mantém a última tela.
      if (next.failed) {
        setStale(true);
        return;
      }
      // Rodada começou ou acabou desde a última busca: abre na aba que faz sentido.
      const hasRound = Boolean(next.windows?.current);
      if (hasRound !== hadRound.current) {
        hadRound.current = hasRound;
        setTab(hasRound ? "rodada" : "evento");
      }
      setSnap(next);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, [telao]);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const clock = setInterval(() => setNow(new Date()), 5_000);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, RANKING_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const current = snap.windows?.current ?? null;
  const hasRounds = snap.windows !== null;
  const activeTab: RankingTab = hasRounds ? tab : "evento";
  const board: Board | null = activeTab === "rodada" ? snap.round : snap.event;

  const body = (
    <MotionConfig reducedMotion="user">
      {hasRounds && (
        <div className="flex justify-center">
          <Tabs value={activeTab} onChange={setTab} big={telao} />
        </div>
      )}

      {activeTab === "rodada" && (
        <RoundHeader
          name={current?.name ?? null}
          range={current ? formatWindowRange(current) : null}
          remaining={
            current && now ? formatRemaining(Date.parse(current.ends_at) - now.getTime()) : null
          }
          big={telao}
        />
      )}

      {snap.previousWinner && (
        <PreviousWinner
          name={snap.previousWinner.display_name}
          time={formatDuration(snap.previousWinner.score)}
          round={snap.windows?.previous?.name ?? "Rodada anterior"}
          big={telao}
        />
      )}

      <div
        role={hasRounds ? "tabpanel" : undefined}
        id={hasRounds ? `ranking-panel-${activeTab}` : undefined}
        aria-labelledby={hasRounds ? `ranking-tab-${activeTab}` : undefined}
        aria-live="polite"
        className={telao ? "mt-10" : "mt-6"}
      >
        <BoardContent
          board={board}
          tab={activeTab}
          hasCurrentRound={Boolean(current)}
          highlight={telao ? null : highlight}
          big={telao}
        />
      </div>

      <LiveStatus fetchedAt={snap.fetchedAt} stale={stale} big={telao} />
    </MotionConfig>
  );

  if (!telao) return body;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-8 py-10 lg:px-12">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-display text-5xl font-extrabold text-fg-strong lg:text-6xl">
            Ranking <span className="text-attention">ao vivo</span>
          </h1>
          <TelaoControls />
        </header>
        <div className="mt-8 flex-1">{body}</div>
        <footer className="mt-10 text-center text-lg text-fg-muted">
          Jogue no estande, crie seu apelido e apareça aqui:{" "}
          <span className="font-mono text-fg-strong">{new URL(site.url).host}</span>
        </footer>
      </div>
    </div>
  );
}
