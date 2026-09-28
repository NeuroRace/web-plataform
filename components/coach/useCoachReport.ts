"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getCoachReportAction } from "@/lib/coach/action";
import type { CoachActionResult } from "@/lib/coach/types";

/**
 * Relatório do NeuroCoach da corrida selecionada; 1 chamada por corrida (memo por id).
 * `retry` descarta o resultado da corrida atual e busca de novo (ex.: depois de um erro).
 */
export function useCoachReport(racePlayerId: string | undefined): {
  result: CoachActionResult | null;
  retry: () => void;
} {
  const [results, setResults] = useState<Record<string, CoachActionResult>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!racePlayerId || results[racePlayerId]) return;
    let alive = true;
    startTransition(async () => {
      let res: CoachActionResult;
      try {
        res = await getCoachReportAction(racePlayerId);
      } catch {
        res = { ok: false, reason: "error" };
      }
      if (alive) setResults((prev) => ({ ...prev, [racePlayerId]: res }));
    });
    return () => {
      alive = false;
    };
  }, [racePlayerId, results]);

  const retry = useCallback(() => {
    if (!racePlayerId) return;
    setResults((prev) => {
      const next = { ...prev };
      delete next[racePlayerId];
      return next;
    });
  }, [racePlayerId]);

  return { result: racePlayerId ? (results[racePlayerId] ?? null) : null, retry };
}
