import type { RaceSummary } from "@/lib/metrics";
import { chooseGoal } from "./goal";
import { classifyArchetype, historyBadges, performanceBadges, type RuleInput } from "./rules";
import { longestRunAtOrAbove, mean, movingAverage, round1, stdDev, thirds, windowDeltas } from "./series";
import type { CoachFacts, CoachMetrics, CoachProgress, Moment } from "./types";

/** Menos que isto é "dados insuficientes" (spec §4.1). */
export const MIN_SAMPLES = 10;
const SMOOTH_WINDOW = 5;
const STREAK_THRESHOLD = 60;
const MIN_STREAK_MOMENT = 3;
const MOMENT_DELTA = 20;
const MIN_MOMENT_GAP = 2;

function diff(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : round1(a - b);
}

function chronological(history: RaceSummary[]): RaceSummary[] {
  return [...history].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.racePlayerId.localeCompare(b.racePlayerId),
  );
}

function buildProgress(race: RaceSummary, history: RaceSummary[]): CoachProgress {
  const ordered = chronological(history);
  const idx = ordered.findIndex((r) => r.racePlayerId === race.racePlayerId);
  const upTo = idx >= 0 ? ordered.slice(0, idx + 1) : [race];
  const raceNumber = upTo.length;
  const prev = raceNumber >= 2 ? upTo[raceNumber - 2] : null;
  const others = upTo.slice(0, -1);

  const att = race.metrics.avgAttention;
  const dur = race.metrics.durationSeconds;
  const othersAtt = others.map((o) => o.metrics.avgAttention).filter((v): v is number => v !== null);
  const othersDur = others.map((o) => o.metrics.durationSeconds).filter((v): v is number => v !== null);

  return {
    raceNumber,
    totalRaces: idx >= 0 ? ordered.length : 1,
    previous: prev
      ? {
          attentionDelta: diff(att, prev.metrics.avgAttention),
          durationDelta: diff(dur, prev.metrics.durationSeconds),
        }
      : null,
    personalBest: {
      attention: raceNumber >= 2 && att !== null && othersAtt.length > 0 && othersAtt.every((o) => att > o),
      time: raceNumber >= 2 && dur !== null && othersDur.length > 0 && othersDur.every((o) => dur < o),
    },
  };
}

export function analyzeRace(race: RaceSummary, history: RaceSummary[]): CoachFacts {
  const points = race.series
    .filter((p): p is { t: number; attention: number; meditation: number | null } => p.attention !== null)
    .sort((a, b) => a.t - b.t);
  const att = points.map((p) => p.attention);
  const n = att.length;
  const progress = buildProgress(race, history);
  const pastBadges = historyBadges(progress.raceNumber, progress.personalBest);

  const baseMetrics = {
    avgAttention: race.metrics.avgAttention,
    peakAttention: race.metrics.peakAttention,
    focusZonePct: race.metrics.focusZonePct,
    avgMeditation: race.metrics.avgMeditation,
    durationSeconds: race.metrics.durationSeconds,
  };

  if (n < MIN_SAMPLES) {
    return {
      version: 1,
      quality: "insufficient",
      sampleCount: n,
      metrics: { ...baseMetrics, thirds: null, volatility: null, bestStreakSeconds: 0 },
      moments: [],
      archetype: null,
      badges: pastBadges,
      progress,
      goal: null,
    };
  }

  const ma = movingAverage(att, SMOOTH_WINDOW);
  const [p1, p2, p3] = thirds(att);
  const th: [number, number, number] = [round1(mean(p1)!), round1(mean(p2)!), round1(mean(p3)!)];
  const volatility = round1(stdDev(ma)!);
  const run = longestRunAtOrAbove(ma, STREAK_THRESHOLD);
  const deltas = windowDeltas(ma, SMOOTH_WINDOW);
  const worst = deltas.reduce<{ index: number; delta: number } | null>((m, d) => (!m || d.delta < m.delta ? d : m), null);
  const best = deltas.reduce<{ index: number; delta: number } | null>((m, d) => (!m || d.delta > m.delta ? d : m), null);

  // Um momento a até MIN_MOMENT_GAP s de outro já escolhido seria um marcador sobreposto
  // no replay dizendo quase a mesma coisa: fica de fora.
  const candidates: Moment[] = [];
  const add = (m: Moment) => {
    if (!candidates.some((c) => Math.abs(c.t - m.t) <= MIN_MOMENT_GAP)) candidates.push(m);
  };
  // Duração real da sequência em segundos (fim − início + 1 amostra de 1 s): contar amostras
  // subestima quando há pacote perdido no meio.
  const streakSeconds = run ? points[run.end].t - points[run.start].t + 1 : 0;
  if (run && run.length >= MIN_STREAK_MOMENT) {
    add({ kind: "streak", t: points[run.start].t, tEnd: points[run.end].t, value: streakSeconds });
  }
  if (worst && worst.delta <= -MOMENT_DELTA) {
    add({ kind: "drop", t: points[worst.index].t, value: Math.round(worst.delta) });
  }
  if (best && best.delta >= MOMENT_DELTA) {
    add({ kind: "rise", t: points[best.index].t, value: Math.round(best.delta) });
  }
  if (candidates.length < 3) {
    const peak = Math.max(...att);
    const i = att.indexOf(peak);
    // Pico dentro da melhor sequência seria um marcador duplicado no replay: fica de fora.
    const insideStreak = run !== null && run.length >= MIN_STREAK_MOMENT && i >= run.start && i <= run.end;
    if (!insideStreak) add({ kind: "peak", t: points[i].t, value: peak });
  }
  const moments = candidates.slice(0, 3).sort((a, b) => a.t - b.t);

  const metrics: CoachMetrics = {
    ...baseMetrics,
    thirds: th,
    volatility,
    bestStreakSeconds: streakSeconds,
  };
  const avgAttention = baseMetrics.avgAttention ?? mean(att)!;
  const input: RuleInput = {
    avgAttention,
    avgMeditation: baseMetrics.avgMeditation,
    thirds: th,
    volatility,
    focusZonePct: baseMetrics.focusZonePct,
    bestRise: best?.delta ?? null,
  };

  return {
    version: 1,
    quality: "ok",
    sampleCount: n,
    metrics,
    moments,
    archetype: classifyArchetype(input),
    badges: [...performanceBadges(input), ...pastBadges],
    progress,
    goal: chooseGoal({
      thirds: th,
      bestStreakSeconds: metrics.bestStreakSeconds,
      volatility,
      worstDrop: worst?.delta ?? null,
      avgAttention,
    }),
  };
}
