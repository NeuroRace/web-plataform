import { buildRaceSummaries, type RaceSummary, type TelemetryRow } from "@/lib/metrics";
import { loadOwnTelemetry } from "./telemetry";
import type { createClient } from "./server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Corridas e apelido do usuário logado. A RLS limita tudo às linhas dele.
 * Usado pelo dashboard e pelo card dos Stories (NEU-88).
 */
export async function loadOwnRaces(
  supabase: ServerClient,
  userId: string,
): Promise<{ summaries: RaceSummary[]; displayName: string | null }> {
  const [{ data: racePlayers }, telemetry, { data: profile }] = await Promise.all([
    supabase
      .from("race_players")
      .select("id, race_id, player_slot, started_at, finished_at")
      .order("started_at", { ascending: true }),
    // Paginado (NEU-115): consulta única é cortada em 1000 linhas pelo PostgREST.
    // Erro de leitura mantém o comportamento anterior: painel sem telemetria.
    loadOwnTelemetry(supabase).catch(() => [] as TelemetryRow[]),
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);

  return {
    summaries: buildRaceSummaries(racePlayers ?? [], telemetry),
    displayName: profile?.display_name ?? null,
  };
}
