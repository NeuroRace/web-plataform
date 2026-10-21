import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LeaderboardRow } from "@/components/ranking/LeaderboardTable";
import { resolveWindows, type RankingWindow, type ResolvedWindows } from "./ranking";

type Client = SupabaseClient<Database>;

export type Board = { rows: LeaderboardRow[]; error: boolean };

/** Tudo o que a tela de ranking precisa num instante. Serializável (vai do server pro client). */
export type RankingSnapshot = {
  /** null = sem rodadas (NEU-110 ainda não publicada ou nada cadastrado): só o ranking geral. */
  windows: ResolvedWindows | null;
  event: Board;
  /** null quando não há rodada acontecendo agora. */
  round: Board | null;
  previousWinner: LeaderboardRow | null;
  /**
   * Alguma busca falhou (rodadas, evento, rodada atual ou vencedor anterior).
   * O snapshot está incompleto: quem já tem uma tela na frente deve mantê-la e avisar.
   */
  failed: boolean;
  /** ISO do momento da busca. */
  fetchedAt: string;
};

// Tabela inexistente: PGRST205 (PostgREST 12+, "not found in the schema cache") ou 42P01 (Postgres).
const MISSING_TABLE = new Set(["PGRST205", "42P01"]);
// Nenhuma função com essa assinatura: get_leaderboard antiga, sem p_from/p_to.
const MISSING_FUNCTION = "PGRST202";

type Fetched<T> = { data: T; error: false } | { data: null; error: true; code?: string };

async function fetchWindows(sb: Client): Promise<Fetched<RankingWindow[]>> {
  const { data, error } = await sb
    .from("ranking_windows")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: true });
  if (error) return { data: null, error: true, code: error.code };
  return { data: data ?? [], error: false };
}

async function fetchBoard(
  sb: Client,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<Board & { code?: string }> {
  const args: Database["public"]["Functions"]["get_leaderboard"]["Args"] = {
    p_metric: "best_time",
    p_limit: opts.limit ?? 50,
  };
  // Só manda o período quando existe: a assinatura antiga não conhece p_from/p_to.
  if (opts.from) args.p_from = opts.from;
  if (opts.to) args.p_to = opts.to;

  const { data, error } = await sb.rpc("get_leaderboard", args);
  if (error) return { rows: [], error: true, code: error.code };
  return { rows: data ?? [], error: false };
}

const toBoard = ({ rows, error }: Board): Board => ({ rows, error });

/**
 * Vencedor oficial da rodada (NEU-167/173), congelado no banco: uma corrida atrasada
 * não troca o nome depois do anúncio.
 * - `covered: false`: a premiação não cuida dessa rodada (desligada ou anterior a
 *   `ligada_em`) ou a função ainda não foi publicada (PGRST202) → 1º ao vivo, como hoje.
 * - `covered: true` com `winner: null`: carência ou sem retirada → o letreiro some.
 *   Também com qualquer outro erro ou formato fora do contrato: na dúvida, não anuncia
 *   ninguém (o 1º ao vivo pode não ser o vencedor oficial).
 * Nunca marca o snapshot como falho: é uma peça à parte do ranking.
 */
async function fetchOfficialWinner(
  sb: Client,
  roundId: string,
): Promise<{ covered: false } | { covered: true; winner: LeaderboardRow | null }> {
  const hidden = (why: string, detail?: unknown) => {
    console.error(`get_official_winners: ${why}`, detail ?? "");
    return { covered: true as const, winner: null };
  };

  const { data, error } = await sb.rpc("get_official_winners");
  if (error?.code === MISSING_FUNCTION) return { covered: false };
  if (error) return hidden("falhou", `${error.code} ${error.message}`);
  if (!Array.isArray(data)) return hidden("formato fora do contrato");

  const row: unknown = data.find(
    (r: unknown) => typeof r === "object" && r !== null && (r as { round_id?: unknown }).round_id === roundId,
  );
  if (!row) return { covered: false };

  const { display_name, score } = row as { display_name?: unknown; score?: unknown };
  if (display_name === null && score === null) return { covered: true, winner: null };
  if (typeof display_name !== "string" || typeof score !== "number") {
    return hidden("linha fora do contrato", roundId);
  }
  return { covered: true, winner: { rank: 1, display_name, score } };
}

/** Só o ranking geral, sem período (antes da NEU-110 ou em deploy parcial). */
async function generalOnly(
  sb: Client,
  now: Date,
  limit: number | undefined,
  failed: boolean,
): Promise<RankingSnapshot> {
  const event = toBoard(await fetchBoard(sb, { limit }));
  return {
    windows: null,
    event,
    round: null,
    previousWinner: null,
    failed: failed || event.error,
    fetchedAt: now.toISOString(),
  };
}

export async function loadRanking(
  sb: Client,
  now: Date = new Date(),
  opts: { limit?: number } = {},
): Promise<RankingSnapshot> {
  const limit = opts.limit;
  const fetched = await fetchWindows(sb);

  if (fetched.error) {
    // Tabela ainda não existe (antes da NEU-110) → segue sem rodadas, sem erro.
    // Qualquer outra falha deixa o snapshot marcado: o client mantém a tela que já tem.
    const missing = fetched.code !== undefined && MISSING_TABLE.has(fetched.code);
    return generalOnly(sb, now, limit, !missing);
  }

  const windows = resolveWindows(fetched.data, now);
  if (!windows) return generalOnly(sb, now, limit, false);

  const { current, previous, eventStart } = windows;
  const [event, round, prev, official] = await Promise.all([
    fetchBoard(sb, { from: eventStart, limit }),
    current
      ? fetchBoard(sb, { from: current.starts_at, to: current.ends_at, limit })
      : Promise.resolve(null),
    previous
      ? fetchBoard(sb, { from: previous.starts_at, to: previous.ends_at, limit: 1 })
      : Promise.resolve(null),
    previous ? fetchOfficialWinner(sb, previous.id) : Promise.resolve(null),
  ]);

  // Deploy parcial (tabela nova, função antiga): o geral ainda funciona sem período.
  // Só nesse caso; outra falha não pode trocar o ranking da rodada pelo de sempre.
  if (event.error && event.code === MISSING_FUNCTION) {
    return generalOnly(sb, now, limit, false);
  }

  return {
    windows,
    event: toBoard(event),
    round: round ? toBoard(round) : null,
    previousWinner: official?.covered ? official.winner : (prev?.rows[0] ?? null),
    failed: event.error || Boolean(round?.error) || Boolean(prev?.error),
    fetchedAt: now.toISOString(),
  };
}
