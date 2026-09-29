import type { RaceSummary } from "@/lib/metrics";
import type { LeaderboardRow } from "@/components/ranking/LeaderboardTable";
import { analyzeRace } from "@/lib/coach/analyze";
import { ARCHETYPE_INFO, BADGE_INFO } from "@/lib/coach/rules";
import type { Archetype, Badge } from "@/lib/coach/types";

/** Cabe no card sem apertar: mais que isso vira lista, não destaque. */
export const MAX_CARD_BADGES = 6;

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

/** Arquétipos de ritmo (arrancada, oscilação, aquecimento) usam o mascote correndo. */
export function mascotFor(archetype: Archetype): "mascot-running.png" | "mascot-winner.png" {
  return archetype === "SPRINTER" ||
    archetype === "ARRANQUE_CRESCENTE" ||
    archetype === "OSCILADOR" ||
    archetype === "EM_AQUECIMENTO"
    ? "mascot-running.png"
    : "mascot-winner.png";
}

/** Card "Meu arquétipo": arquétipo e badges do NeuroCoach 2.0 de uma corrida. */
export type ArchetypeCardData = {
  name: string;
  rank: number | null;
  archetype: { id: Archetype; label: string; description: string };
  badges: { id: Badge; label: string; description: string }[];
  race: {
    avgFocus: number | null;
    peakFocus: number | null;
    durationSeconds: number | null;
    /** Nº da corrida na história da pessoa (1 = primeira). */
    raceNumber: number;
  };
};

function rankOf(displayName: string | null, leaderboard: LeaderboardRow[]): number | null {
  const key = displayName?.toLowerCase();
  return (key && leaderboard.find((r) => r.display_name.toLowerCase() === key)?.rank) || null;
}

/**
 * Usa a corrida mais recente com dados suficientes (o mesmo `analyzeRace` do dashboard,
 * então o card bate com o NeuroCoach). null se nenhuma corrida tem amostras suficientes.
 */
export function buildArchetypeCard({
  displayName,
  races,
  leaderboard,
}: {
  displayName: string | null;
  races: RaceSummary[];
  leaderboard: LeaderboardRow[];
}): ArchetypeCardData | null {
  const newestFirst = [...races].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  for (const race of newestFirst) {
    const facts = analyzeRace(race, races);
    if (facts.quality !== "ok" || !facts.archetype) continue;
    return {
      name: displayName ?? "Jogador NeuroRace",
      rank: rankOf(displayName, leaderboard),
      archetype: { id: facts.archetype, ...ARCHETYPE_INFO[facts.archetype] },
      badges: facts.badges.slice(0, MAX_CARD_BADGES).map((id) => ({
        id,
        label: BADGE_INFO[id].label,
        description: BADGE_INFO[id].description,
      })),
      race: {
        avgFocus: race.metrics.avgAttention != null ? Math.round(race.metrics.avgAttention) : null,
        peakFocus: race.metrics.peakAttention != null ? Math.round(race.metrics.peakAttention) : null,
        durationSeconds: race.metrics.durationSeconds,
        raceNumber: facts.progress.raceNumber,
      },
    };
  }
  return null;
}
