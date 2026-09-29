import type { Goal, Moment } from "./types";

export const MOMENT_SYMBOLS = ["①", "②", "③"] as const;

export function formatClock(t: number): string {
  const s = Math.max(0, Math.round(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDecimal(v: number): string {
  return String(v).replace(".", ",");
}

export function describeMoment(m: Moment): string {
  switch (m.kind) {
    case "streak":
      return `${formatClock(m.t)}–${formatClock(m.tEnd ?? m.t)} · ${m.value} s seguidos em foco alto`;
    case "drop":
      return `${formatClock(m.t)} · o foco caiu ${Math.abs(m.value)} pts em 5 s`;
    case "rise":
      return `${formatClock(m.t)} · recuperou ${m.value} pts de foco em 5 s`;
    case "peak":
      return `${formatClock(m.t)} · pico de atenção: ${m.value}`;
  }
}

export function describeGoal(g: Goal): string {
  switch (g.kind) {
    case "final_third":
      return `Chegue ao terço final com foco médio de ${g.target} (hoje: ${g.current})`;
    case "streak":
      return `Segure o foco alto por ${g.target} s seguidos (hoje: ${g.current} s)`;
    case "stability":
      return `Evite quedas de foco maiores que ${g.target} pts em 5 s (hoje: ${g.current})`;
    case "average":
      return `Suba seu foco médio para ${g.target} (hoje: ${g.current})`;
  }
}
