"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  // Corridas com chamada em andamento: trocar A→B→A rápido não dispara A de novo. O resultado
  // é guardado por id, então chegar depois da troca não mostra dado da corrida errada.
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    if (!racePlayerId || results[racePlayerId] || inFlight.current.has(racePlayerId)) return;
    inFlight.current.add(racePlayerId);
    startTransition(async () => {
      let res: CoachActionResult;
      try {
        res = await getCoachReportAction(racePlayerId);
      } catch {
        res = { ok: false, reason: "error" };
      }
      inFlight.current.delete(racePlayerId);
      setResults((prev) => ({ ...prev, [racePlayerId]: res }));
    });
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
