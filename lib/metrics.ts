import type { Database } from "@/lib/supabase/database.types";
import { metricsConfig } from "@/lib/site";

/**
 * Métricas derivadas da telemetria crua (attention/meditation ao longo do tempo).
 * PROVISÓRIO — pendente da definição oficial do backend (PLANO §3 / D1).
 * Quando o backend publicar a view agregada, trocamos esta derivação por ela.
 */

export type TelemetryRow = Pick<
  Database["public"]["Tables"]["telemetry_points"]["Row"],
  "race_player_id" | "t" | "attention" | "meditation"
>;

export interface RaceMetrics {
  avgAttention: number | null;
  peakAttention: number | null;
  focusZonePct: number | null;
  avgMeditation: number | null;
  durationSeconds: number | null;
  sampleCount: number;
}

export interface SeriesPoint {
  /** segundos desde o início da corrida */
  t: number;
  attention: number | null;
  meditation: number | null;
}

export interface RaceSummary {
  racePlayerId: string;
  raceId: string;
  startedAt: string;
  finishedAt: string | null;
  slot: number;
  metrics: RaceMetrics;
  series: SeriesPoint[];
}

function mean(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

export function computeMetrics(
  points: TelemetryRow[],
  startedAt: string,
  finishedAt: string | null,
): RaceMetrics {
  const att = points
    .map((p) => p.attention)
    .filter((v): v is number => v != null);
  const med = points
    .map((p) => p.meditation)
    .filter((v): v is number => v != null);

  const focusZonePct = att.length
    ? (att.filter((a) => a >= metricsConfig.focusZoneThreshold).length /
        att.length) *
      100
    : null;

  let durationSeconds: number | null = null;
  if (startedAt && finishedAt) {
    durationSeconds =
      (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
  }

  return {
    avgAttention: mean(att),
    peakAttention: att.length ? Math.max(...att) : null,
    focusZonePct,
    avgMeditation: mean(med),
    durationSeconds,
    sampleCount: points.length,
  };
}

export function buildSeries(
  points: TelemetryRow[],
  startedAt: string,
): SeriesPoint[] {
  const base = new Date(startedAt).getTime();
  return points
    .slice()
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
    .map((p) => ({
      t: Math.max(0, Math.round((new Date(p.t).getTime() - base) / 1000)),
      attention: p.attention,
      meditation: p.meditation,
    }));
}

/** Monta os resumos por corrida a partir das linhas cruas (uso no servidor). */
export function buildRaceSummaries(
  racePlayers: Array<{
    id: string;
    race_id: string;
    player_slot: number;
    started_at: string;
    finished_at: string | null;
  }>,
  telemetry: TelemetryRow[],
): RaceSummary[] {
  const byPlayer = new Map<string, TelemetryRow[]>();
  for (const point of telemetry) {
    const list = byPlayer.get(point.race_player_id) ?? [];
    list.push(point);
    byPlayer.set(point.race_player_id, list);
  }

  return racePlayers.map((rp) => {
    const points = byPlayer.get(rp.id) ?? [];
    return {
      racePlayerId: rp.id,
      raceId: rp.race_id,
      startedAt: rp.started_at,
      finishedAt: rp.finished_at,
      slot: rp.player_slot,
      metrics: computeMetrics(points, rp.started_at, rp.finished_at),
      series: buildSeries(points, rp.started_at),
    };
  });
}

export function formatDuration(s: number | null): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

export function formatPct(v: number | null): string {
  return v == null ? "—" : `${v.toFixed(0)}%`;
}

export function formatRaceDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
