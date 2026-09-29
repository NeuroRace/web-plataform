import { MOMENT_SYMBOLS } from "@/lib/coach/describe";
import type { Moment } from "@/lib/coach/types";
import type { SeriesPoint } from "@/lib/metrics";

/** Momentos do NeuroCoach → marcadores do gráfico de replay (numerados como no card). */
export function momentMarkers(
  series: SeriesPoint[],
  moments: Moment[],
): { dots: Array<{ x: number; y: number; label: string }>; area: { x1: number; x2: number } | null } {
  const withValue = series.filter((p): p is SeriesPoint & { attention: number } => p.attention !== null);
  const yAt = (t: number) =>
    withValue.reduce<{ d: number; y: number } | null>((best, p) => {
      const d = Math.abs(p.t - t);
      return !best || d < best.d ? { d, y: p.attention } : best;
    }, null)?.y ?? 0;

  const streak = moments.find((m) => m.kind === "streak");
  return {
    dots: moments.map((m, i) => ({ x: m.t, y: yAt(m.t), label: MOMENT_SYMBOLS[i] ?? String(i + 1) })),
    area: streak ? { x1: streak.t, x2: streak.tEnd ?? streak.t } : null,
  };
}
