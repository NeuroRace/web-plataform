"use server";

import { hasValidConsent } from "@/lib/consent";
import { buildRaceSummaries, type TelemetryRow } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { analyzeRace } from "./analyze";
import { cachedAiNarrative } from "./narrative-ai";
import { templateNarrative } from "./narrative-template";
import type { CoachActionResult, CoachFacts, CoachNarrative } from "./types";

/**
 * NeuroCoach 2.0 (NEU-115). Recebe SÓ o id da corrida: os dados vêm do banco pela RLS
 * (a pessoa só enxerga as próprias corridas), nunca do navegador (NEU-106).
 */
export async function getCoachReportAction(racePlayerId: string): Promise<CoachActionResult> {
  if (typeof racePlayerId !== "string" || racePlayerId.length === 0 || racePlayerId.length > 64) {
    return { ok: false, reason: "not_found" };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "unauthenticated" };

    // A série da corrida selecionada vem filtrada pelo id: o histórico inteiro pode passar
    // do limite de 1000 linhas do PostgREST, a corrida analisada não pode ser truncada.
    const [players, allTelemetry, raceTelemetry] = await Promise.all([
      supabase
        .from("race_players")
        .select("id, race_id, player_slot, started_at, finished_at")
        .order("started_at", { ascending: true }),
      supabase
        .from("telemetry_points")
        .select("race_player_id, t, attention, meditation")
        .order("t", { ascending: true }),
      supabase
        .from("telemetry_points")
        .select("race_player_id, t, attention, meditation")
        .eq("race_player_id", racePlayerId)
        .order("t", { ascending: true }),
    ]);
    if (players.error || allTelemetry.error || raceTelemetry.error) throw new Error("neurocoach_load_failed");

    const rows = players.data ?? [];
    if (!rows.some((r) => r.id === racePlayerId)) return { ok: false, reason: "not_found" };

    const others = ((allTelemetry.data ?? []) as TelemetryRow[]).filter((p) => p.race_player_id !== racePlayerId);
    const history = buildRaceSummaries(rows, [...others, ...((raceTelemetry.data ?? []) as TelemetryRow[])]);
    const race = history.find((r) => r.racePlayerId === racePlayerId)!;

    const facts = analyzeRace(race, history);
    return { ok: true, facts, narrative: await narrate(facts, user.user_metadata) };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "neurocoach_action_error",
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, reason: "error" };
  }
}

async function narrate(facts: CoachFacts, metadata: unknown): Promise<CoachNarrative> {
  const apiKey = process.env.GROQ_API_KEY;
  // LLM só com consentimento LGPD (NEU-94/ADR 0003) e só quando há o que analisar.
  if (apiKey && facts.quality === "ok" && hasValidConsent(metadata)) {
    try {
      return { ...(await cachedAiNarrative(facts, apiKey)), source: "ai" };
    } catch (err) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "neurocoach_ai_fallback",
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  return templateNarrative(facts);
}
