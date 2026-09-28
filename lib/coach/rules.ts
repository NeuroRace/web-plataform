import type { Archetype, Badge } from "./types";

/**
 * Limiares do NeuroCoach 2.0 (spec §4.4/§4.5). Calibrados em 28/09 com as 13 corridas
 * reais de produção (só agregados). Recalibrar no NEXT com mais dados.
 */
export const THRESHOLDS = {
  lowAttention: 45,
  highAttention: 60,
  thirdsSwing: 10,
  volatile: 15,
  zenMeditation: 55,
  zenVolatility: 10,
  lightningStart: 60,
  steelVolatility: 10,
  comeback: 45,
  flowZone: 50,
  calmMeditation: 55,
} as const;

export interface RuleInput {
  avgAttention: number;
  avgMeditation: number | null;
  thirds: [number, number, number];
  volatility: number;
  focusZonePct: number | null;
  /** Maior subida da MA5 em 5 amostras. */
  bestRise: number | null;
}

export function classifyArchetype(x: RuleInput): Archetype {
  const [t1, , t3] = x.thirds;
  if (x.avgAttention < THRESHOLDS.lowAttention) return "EM_AQUECIMENTO";
  if (x.avgAttention >= THRESHOLDS.highAttention) return "HIPERFOCADO";
  if (t3 - t1 >= THRESHOLDS.thirdsSwing) return "ARRANQUE_CRESCENTE";
  if (t1 - t3 >= THRESHOLDS.thirdsSwing) return "SPRINTER";
  if (x.volatility >= THRESHOLDS.volatile) return "OSCILADOR";
  if ((x.avgMeditation ?? 0) >= THRESHOLDS.zenMeditation && x.volatility < THRESHOLDS.zenVolatility) {
    return "MESTRE_ZEN";
  }
  return "EQUILIBRADO";
}

export function performanceBadges(x: RuleInput): Badge[] {
  const [t1, , t3] = x.thirds;
  const out: Badge[] = [];
  if (t1 >= THRESHOLDS.lightningStart) out.push("LARGADA_RELAMPAGO");
  if (x.volatility <= THRESHOLDS.steelVolatility) out.push("MENTE_DE_ACO");
  if (x.bestRise !== null && x.bestRise >= THRESHOLDS.comeback) out.push("VIRADA_MENTAL");
  if (x.focusZonePct !== null && x.focusZonePct >= THRESHOLDS.flowZone) out.push("MODO_FLOW");
  if (x.avgMeditation !== null && x.avgMeditation >= THRESHOLDS.calmMeditation) out.push("CALMA_TOTAL");
  if (t3 >= t1) out.push("FADIGA_ZERO");
  return out;
}

export function historyBadges(
  raceNumber: number,
  personalBest: { attention: boolean; time: boolean },
): Badge[] {
  if (raceNumber === 1) return ["PRIMEIRA_CORRIDA"];
  return personalBest.attention || personalBest.time ? ["RECORDE_PESSOAL"] : [];
}

export const ARCHETYPE_INFO: Record<Archetype, { label: string; description: string }> = {
  EM_AQUECIMENTO: { label: "Em Aquecimento", description: "Foco médio abaixo de 45: a mente ainda pegando o ritmo." },
  HIPERFOCADO: { label: "Hiperfocado", description: "Foco médio de 60 ou mais durante a corrida." },
  ARRANQUE_CRESCENTE: { label: "Arranque Crescente", description: "Terminou pelo menos 10 pontos mais focado do que começou." },
  SPRINTER: { label: "Sprinter", description: "Começou forte e perdeu pelo menos 10 pontos até o fim." },
  OSCILADOR: { label: "Oscilador", description: "Foco em altos e baixos, com variação forte ao longo da corrida." },
  MESTRE_ZEN: { label: "Mestre Zen", description: "Calma alta e foco muito estável." },
  EQUILIBRADO: { label: "Equilibrado", description: "Foco estável, sem grandes quedas nem arrancadas." },
};

export const BADGE_INFO: Record<Badge, { label: string; icon: string; description: string }> = {
  LARGADA_RELAMPAGO: { label: "Largada Relâmpago", icon: "⚡", description: "Foco médio de 60+ no primeiro terço." },
  MENTE_DE_ACO: { label: "Mente de Aço", icon: "🛡️", description: "Foco muito estável do começo ao fim." },
  VIRADA_MENTAL: { label: "Virada Mental", icon: "🔄", description: "Recuperou 45+ pontos de foco em 5 s." },
  MODO_FLOW: { label: "Modo Flow", icon: "🌊", description: "Metade ou mais da corrida na zona de foco." },
  CALMA_TOTAL: { label: "Calma Total", icon: "🧘", description: "Índice de calma médio de 55+." },
  FADIGA_ZERO: { label: "Fadiga Zero", icon: "🔋", description: "Terminou tão focado quanto começou." },
  RECORDE_PESSOAL: { label: "Recorde Pessoal", icon: "🏆", description: "Seu melhor foco ou seu melhor tempo até aqui." },
  PRIMEIRA_CORRIDA: { label: "Primeira Corrida", icon: "🏁", description: "Sua primeira corrida no NeuroRace." },
};
