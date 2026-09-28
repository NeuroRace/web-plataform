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
  /** ISO do momento da busca. */
  fetchedAt: string;
};

async function fetchWindows(sb: Client): Promise<RankingWindow[]> {
  const { data, error } = await sb
    .from("ranking_windows")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: true });
  // Tabela ainda não existe em produção (antes da NEU-110) → segue sem rodadas.
  if (error || !data) return [];
  return data;
}

async function fetchBoard(
  sb: Client,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<Board> {
  const args: Database["public"]["Functions"]["get_leaderboard"]["Args"] = {
    p_metric: "best_time",
    p_limit: opts.limit ?? 50,
  };
  // Só manda o período quando existe: a assinatura antiga não conhece p_from/p_to.
  if (opts.from) args.p_from = opts.from;
  if (opts.to) args.p_to = opts.to;

  const { data, error } = await sb.rpc("get_leaderboard", args);
  return { rows: data ?? [], error: Boolean(error) };
}

export async function loadRanking(
  sb: Client,
  now: Date = new Date(),
  opts: { limit?: number } = {},
): Promise<RankingSnapshot> {
  const windows = resolveWindows(await fetchWindows(sb), now);
  const limit = opts.limit;

  if (!windows) {
    return {
      windows: null,
      event: await fetchBoard(sb, { limit }),
      round: null,
      previousWinner: null,
      fetchedAt: now.toISOString(),
    };
  }

  const { current, previous, eventStart } = windows;
  const [event, round, prev] = await Promise.all([
    fetchBoard(sb, { from: eventStart, limit }),
    current
      ? fetchBoard(sb, { from: current.starts_at, to: current.ends_at, limit })
      : Promise.resolve(null),
    previous
      ? fetchBoard(sb, { from: previous.starts_at, to: previous.ends_at, limit: 1 })
      : Promise.resolve(null),
  ]);

  // Deploy parcial (tabela nova, função antiga): o geral ainda funciona sem período.
  if (event.error) {
    return {
      windows: null,
      event: await fetchBoard(sb, { limit }),
      round: null,
      previousWinner: null,
      fetchedAt: now.toISOString(),
    };
  }

  return {
    windows,
    event,
    round,
    previousWinner: prev?.rows[0] ?? null,
    fetchedAt: now.toISOString(),
  };
}
