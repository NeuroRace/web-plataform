import { buildRaceSummaries, type RaceSummary } from "@/lib/metrics";

/** n amostras iguais a v. */
export const flat = (v: number, n: number): number[] => Array.from({ length: n }, () => v);

/**
 * Corrida consistente (métricas e série via buildRaceSummaries, como na produção):
 * uma amostra por segundo a partir de `startedAt`.
 */
export function makeRace(
  attention: Array<number | null>,
  opts: {
    id?: string;
    startedAt?: string;
    meditation?: number | Array<number | null>;
    /** Duração da corrida; null = corrida sem finished_at. */
    durationSeconds?: number | null;
  } = {},
): RaceSummary {
  const id = opts.id ?? "rp-1";
  const startedAt = opts.startedAt ?? "2026-09-30T17:00:00.000Z";
  const base = Date.parse(startedAt);
  const duration = opts.durationSeconds === undefined ? attention.length : opts.durationSeconds;
  const telemetry = attention.map((a, i) => ({
    race_player_id: id,
    t: new Date(base + i * 1000).toISOString(),
    attention: a,
    meditation: Array.isArray(opts.meditation) ? (opts.meditation[i] ?? null) : (opts.meditation ?? 50),
  }));
  const [race] = buildRaceSummaries(
    [
      {
        id,
        race_id: `race-${id}`,
        player_slot: 1,
        started_at: startedAt,
        finished_at: duration === null ? null : new Date(base + duration * 1000).toISOString(),
      },
    ],
    telemetry,
  );
  return race;
}
