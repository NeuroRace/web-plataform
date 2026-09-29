import type { RaceSummary } from "@/lib/metrics";
import type { LeaderboardRow } from "@/components/ranking/LeaderboardTable";

/** O que vai no card dos Stories (NEU-88). Só dados que a pessoa já vê no próprio dashboard. */
export type ShareCardData = {
  name: string;
  /** Segundos. Do ranking quando a pessoa está nele; senão, a menor duração das corridas dela. */
  bestTime: number | null;
  /** Posição no ranking geral do evento; null fora do ranking (sem apelido ou sem corrida válida). */
  rank: number | null;
  races: number;
  /** Média do foco (atenção) das corridas com amostra, 0–100. */
  avgFocus: number | null;
};

export function buildShareCard({
  displayName,
  races,
  leaderboard,
}: {
  displayName: string | null;
  races: RaceSummary[];
  leaderboard: LeaderboardRow[];
}): ShareCardData {
  // display_name é citext no banco: compara sem diferenciar maiúsculas.
  const key = displayName?.toLowerCase();
  const row = key ? leaderboard.find((r) => r.display_name.toLowerCase() === key) : undefined;

  const durations = races
    .map((r) => r.metrics.durationSeconds)
    .filter((d): d is number => d != null && d > 0);
  const focus = races
    .map((r) => r.metrics.avgAttention)
    .filter((v): v is number => v != null);

  return {
    name: displayName ?? "Jogador NeuroRace",
    bestTime: row?.score ?? (durations.length ? Math.min(...durations) : null),
    rank: row?.rank ?? null,
    races: races.length,
    avgFocus: focus.length ? Math.round(focus.reduce((a, b) => a + b, 0) / focus.length) : null,
  };
}
