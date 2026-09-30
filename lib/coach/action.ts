"use server";

import { buildRaceSummaries } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { loadOwnTelemetry } from "@/lib/supabase/telemetry";
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

    // Telemetria paginada: uma consulta única é cortada em 1000 linhas pelo PostgREST e
    // truncaria a corrida analisada e a evolução em relação às anteriores.
    const [players, telemetry] = await Promise.all([
      supabase
        .from("race_players")
        .select("id, race_id, player_slot, started_at, finished_at")
        .order("started_at", { ascending: true }),
      loadOwnTelemetry(supabase),
    ]);
    if (players.error) throw new Error("neurocoach_load_failed");

    const rows = players.data ?? [];
    if (!rows.some((r) => r.id === racePlayerId)) return { ok: false, reason: "not_found" };

    const history = buildRaceSummaries(rows, telemetry);
    const race = history.find((r) => r.racePlayerId === racePlayerId)!;

    const facts = analyzeRace(race, history);
    return { ok: true, facts, narrative: await narrate(facts) };
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

async function narrate(facts: CoachFacts): Promise<CoachNarrative> {
  const apiKey = process.env.GROQ_API_KEY;
  // Liga/desliga explícito, além da chave: o ADR 0003 (§6, NEU-94) exige verificar a política de
  // retenção/treino da Groq antes de mandar dado de EEG, mesmo agregado. Uma chave que já exista
  // na Vercel (IA Coach antiga) não pode ligar a IA sozinha.
  const aiEnabled = process.env.NEUROCOACH_AI_ENABLED === "true";
  // Para toda pessoa logada, com ou sem aceite LGPD (NEU-132). Só números agregados vão para a
  // Groq (sem e-mail, id ou data), e só quando há o que analisar.
  if (aiEnabled && apiKey && facts.quality === "ok") {
    try {
      const ai = await cachedAiNarrative(facts, apiKey);
      if (ai) return { ...ai, source: "ai" };
    } catch (err) {
      // Sem a mensagem: ela pode trazer trecho da resposta do modelo (spec §5.2).
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "neurocoach_ai_fallback",
          error: err instanceof Error ? err.name : "unknown",
        }),
      );
    }
  }
  return templateNarrative(facts);
}
