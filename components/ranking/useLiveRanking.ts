"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RANKING_REFRESH_MS } from "@/lib/ranking";
import { loadRanking, type RankingSnapshot } from "@/lib/ranking-data";

/**
 * Ranking ao vivo: parte do snapshot do servidor e busca de novo a cada 15 s,
 * só com a aba visível. Se uma busca falhar, mantém o último snapshot e marca `stale`.
 * `onUpdate` recebe cada snapshot novo (antes de virar estado), para quem reage a mudanças.
 */
export function useLiveRanking(
  initial: RankingSnapshot,
  opts: { limit?: number; onUpdate?: (next: RankingSnapshot) => void } = {},
) {
  const { limit } = opts;
  const [snap, setSnap] = useState(initial);
  // Snapshot do servidor já incompleto: avisa desde o início.
  const [stale, setStale] = useState(initial.failed);
  const inFlight = useRef(false);
  const onUpdate = useRef(opts.onUpdate);
  useEffect(() => {
    onUpdate.current = opts.onUpdate;
  });

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await loadRanking(createClient(), new Date(), { limit });
      // Qualquer busca falhou (rodadas, evento, rodada ou vencedor): mantém a última tela.
      if (next.failed) {
        setStale(true);
        return;
      }
      onUpdate.current?.(next);
      setSnap(next);
      setStale(false);
    } catch {
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, [limit]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, RANKING_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { snap, stale };
}

/** Relógio só depois de montar (evita divergência de hidratação). */
export function useNow(everyMs: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const tick = setInterval(() => setNow(new Date()), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
    };
  }, [everyMs]);
  return now;
}
