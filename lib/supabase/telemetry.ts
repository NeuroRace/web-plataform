import type { TelemetryRow } from "@/lib/metrics";
import type { createClient } from "./server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Tamanho de página = limite padrão de linhas por resposta do PostgREST no Supabase. */
export const TELEMETRY_PAGE_SIZE = 1000;
/** Trava contra laço infinito: 50 páginas ≈ 50 mil amostras (~13 h de corrida a 1 Hz). */
const MAX_PAGES = 50;

/**
 * Toda a telemetria que a RLS deixa o usuário ver (só a dele), paginada. Uma consulta
 * única é cortada em 1000 linhas pelo PostgREST e truncava o histórico (NEU-115).
 * Ordem por `id` para as páginas não se sobreporem nem pularem linhas.
 */
export async function loadOwnTelemetry(
  supabase: ServerClient,
  pageSize = TELEMETRY_PAGE_SIZE,
): Promise<TelemetryRow[]> {
  const rows: TelemetryRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("telemetry_points")
      .select("race_player_id, t, attention, meditation")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`telemetry_load_failed: ${error.message}`);
    rows.push(...((data ?? []) as TelemetryRow[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
