import { buildRaceSummaries, type RaceSummary } from "@/lib/metrics";

/**
 * Corrida de demonstração do dashboard (`?demo=true` sem corridas reais). 62 s, 1 amostra/s:
 * largada forte, foco alto até ~40 s e queda na reta final. Determinística (sem Date.now()).
 */
const STARTED = "2026-09-30T17:00:00.000Z";
const base = Date.parse(STARTED);
const attention = Array.from({ length: 62 }, (_, t) => {
  if (t < 5) return 70;
  if (t < 35) return 85 - (t % 4);
  if (t < 42) return 77;
  return 32 + (t % 3);
});

export const DEMO_RACE: RaceSummary = buildRaceSummaries(
  [
    {
      id: "demo-race-01",
      race_id: "race-demo-01",
      player_slot: 1,
      started_at: STARTED,
      finished_at: new Date(base + 62_400).toISOString(),
    },
  ],
  attention.map((a, t) => ({
    race_player_id: "demo-race-01",
    t: new Date(base + t * 1000).toISOString(),
    attention: a,
    meditation: 48 + (t % 5),
  })),
)[0];
