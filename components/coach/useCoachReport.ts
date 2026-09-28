"use client";

import { useEffect, useState, useTransition } from "react";
import { getCoachReportAction } from "@/lib/coach/action";
import type { CoachActionResult } from "@/lib/coach/types";

/** Relatório do NeuroCoach da corrida selecionada; 1 chamada por corrida (memo por id). */
export function useCoachReport(racePlayerId: string | undefined): CoachActionResult | null {
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

  return racePlayerId ? (results[racePlayerId] ?? null) : null;
}
