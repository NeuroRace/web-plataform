/** Tipos do NeuroCoach 2.0 (NEU-115). Spec: docs/superpowers/specs/2026-09-28-neurocoach-2-design.md */

export type Archetype =
  | "EM_AQUECIMENTO"
  | "HIPERFOCADO"
  | "ARRANQUE_CRESCENTE"
  | "SPRINTER"
  | "OSCILADOR"
  | "MESTRE_ZEN"
  | "EQUILIBRADO";

export type Badge =
  | "LARGADA_RELAMPAGO"
  | "MENTE_DE_ACO"
  | "VIRADA_MENTAL"
  | "MODO_FLOW"
  | "CALMA_TOTAL"
  | "FADIGA_ZERO"
  | "RECORDE_PESSOAL"
  | "PRIMEIRA_CORRIDA";

export type MomentKind = "streak" | "drop" | "rise" | "peak";

export interface Moment {
  kind: MomentKind;
  /** Segundo da corrida (desde a largada). */
  t: number;
  /** Fim da sequência — só em `streak`. */
  tEnd?: number;
  /** streak: segundos; drop/rise: variação em pts em 5 s; peak: índice de atenção. */
  value: number;
}

export type GoalKind = "final_third" | "streak" | "stability" | "average";

export interface Drill {
  title: string;
  steps: string;
}

export interface Goal {
  kind: GoalKind;
  current: number;
  target: number;
  unit: "pts" | "s";
  drill: Drill;
}

export interface CoachMetrics {
  avgAttention: number | null;
  peakAttention: number | null;
  focusZonePct: number | null;
  avgMeditation: number | null;
  durationSeconds: number | null;
  /** Média do attention bruto por terço (1 casa). null se `insufficient`. */
  thirds: [number, number, number] | null;
  /** Desvio-padrão da média móvel de 5 amostras (1 casa). null se `insufficient`. */
  volatility: number | null;
  /** Maior sequência com MA5 >= 60, em amostras (~s a 1 Hz). */
  bestStreakSeconds: number;
}

export interface CoachProgress {
  raceNumber: number;
  totalRaces: number;
  previous: { attentionDelta: number | null; durationDelta: number | null } | null;
  personalBest: { attention: boolean; time: boolean };
}

export interface CoachFacts {
  version: 1;
  quality: "ok" | "insufficient";
  sampleCount: number;
  metrics: CoachMetrics;
  moments: Moment[];
  archetype: Archetype | null;
  badges: Badge[];
  progress: CoachProgress;
  goal: Goal | null;
}

export interface CoachNarrative {
  headline: string;
  summary: string;
  source: "ai" | "template";
}

export type CoachActionResult =
  | { ok: true; facts: CoachFacts; narrative: CoachNarrative }
  | { ok: false; reason: "unauthenticated" | "not_found" | "error" };
