import type { RaceSummary, SeriesPoint } from "@/lib/metrics";

export interface ExtractedRacePayload {
  playerSummary: RaceSummary;
  opponentSummary: RaceSummary | null;
  extractedFeatures: {
    result: "VICTORY" | "DEFEAT" | "DRAW" | "SOLO";
    timeDeltaSeconds: number | null;
    stabilityStdDev: number;
    chokeDetected: boolean;
    chokeTimestampSecond: number | null;
    attentionSlices: Array<{
      phase: string;
      avgAttention: number;
      avgMeditation: number;
    }>;
  };
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

export function extractCognitiveFeatures(
  player: RaceSummary,
  opponent?: RaceSummary | null
): ExtractedRacePayload {
  const attPoints = player.series
    .map((s) => s.attention)
    .filter((v): v is number => v !== null);

  const duration = player.metrics.durationSeconds ?? 0;
  const oppDuration = opponent?.metrics.durationSeconds ?? null;

  // 1. Determinar resultado da corrida
  let result: ExtractedRacePayload["extractedFeatures"]["result"] = "SOLO";
  let timeDeltaSeconds: number | null = null;

  if (oppDuration !== null && duration > 0) {
    timeDeltaSeconds = Math.round((duration - oppDuration) * 10) / 10;
    if (timeDeltaSeconds < -0.1) result = "VICTORY";
    else if (timeDeltaSeconds > 0.1) result = "DEFEAT";
    else result = "DRAW";
  }

  // 2. Fatiamento em 3 fases da corrida
  const sliceSize = Math.max(1, Math.floor(player.series.length / 3));
  const p1 = player.series.slice(0, sliceSize);
  const p2 = player.series.slice(sliceSize, sliceSize * 2);
  const p3 = player.series.slice(sliceSize * 2);

  const calcSliceAvg = (slice: SeriesPoint[]) => {
    const att = slice.map((s) => s.attention).filter((v): v is number => v !== null);
    const med = slice.map((s) => s.meditation).filter((v): v is number => v !== null);
    return {
      avgAttention: att.length ? Math.round((att.reduce((a, b) => a + b, 0) / att.length) * 10) / 10 : 0,
      avgMeditation: med.length ? Math.round((med.reduce((a, b) => a + b, 0) / med.length) * 10) / 10 : 0,
    };
  };

  const s1 = calcSliceAvg(p1);
  const s2 = calcSliceAvg(p2);
  const s3 = calcSliceAvg(p3);

  // 3. Detecção de Choke (Queda > 35% no terço final em relação ao início)
  let chokeDetected = false;
  let chokeTimestampSecond: number | null = null;

  if (s1.avgAttention >= 60 && s3.avgAttention < 40 && (s1.avgAttention - s3.avgAttention) >= 30) {
    chokeDetected = true;
    // Ponto onde a atenção caiu drasticamente
    const dropPoint = player.series.find((p, idx) => idx > sliceSize && (p.attention ?? 100) < 40);
    chokeTimestampSecond = dropPoint ? dropPoint.t : null;
  }

  return {
    playerSummary: player,
    opponentSummary: opponent ?? null,
    extractedFeatures: {
      result,
      timeDeltaSeconds,
      stabilityStdDev: calculateStdDev(attPoints),
      chokeDetected,
      chokeTimestampSecond,
      attentionSlices: [
        { phase: "Início (0-33%)", ...s1 },
        { phase: "Meio (34-66%)", ...s2 },
        { phase: "Final (67-100%)", ...s3 },
      ],
    },
  };
}