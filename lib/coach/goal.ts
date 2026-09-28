import type { Drill, Goal, GoalKind } from "./types";

/** Um exercício por tipo de meta — texto fixo do time, sem promessa clínica (spec §4.7). */
export const DRILLS: Record<GoalKind, Drill> = {
  final_third: {
    title: "Reset no meio da prova",
    steps: "Quando passar da metade da corrida, solte uma expiração longa pela boca e volte o olhar para o ponto de fuga da pista.",
  },
  streak: {
    title: "Âncora visual",
    steps: "Escolha um ponto fixo logo à frente do carro e volte a ele sempre que perceber a mente saindo da corrida.",
  },
  stability: {
    title: "Respiração 4-4-4 antes da largada",
    steps: "Antes de largar, faça 3 ciclos: inspire em 4 s, segure por 4 s e expire em 4 s.",
  },
  average: {
    title: "Aquecimento de 30 s",
    steps: "Antes de colocar o fone, passe 30 s contando as respirações de 1 a 10, recomeçando se perder a conta.",
  },
};

export interface GoalInput {
  thirds: [number, number, number];
  bestStreakSeconds: number;
  volatility: number;
  /** Pior variação da MA5 em 5 amostras (negativa = queda). */
  worstDrop: number | null;
  avgAttention: number;
}

export function chooseGoal(x: GoalInput): Goal {
  const [t1, , t3] = x.thirds;
  if (t1 - t3 >= 10) {
    const current = Math.round(t3);
    return { kind: "final_third", current, target: Math.min(Math.round(t1), current + 8), unit: "pts", drill: DRILLS.final_third };
  }
  if (x.bestStreakSeconds < 10) {
    const s = x.bestStreakSeconds;
    return { kind: "streak", current: s, target: s + Math.max(3, Math.ceil(0.3 * s)), unit: "s", drill: DRILLS.streak };
  }
  if (x.volatility >= 15 && x.worstDrop !== null && x.worstDrop < 0) {
    const current = Math.round(Math.abs(x.worstDrop));
    return { kind: "stability", current, target: Math.round(0.7 * current), unit: "pts", drill: DRILLS.stability };
  }
  const current = Math.round(x.avgAttention);
  return { kind: "average", current, target: Math.min(100, current + 5), unit: "pts", drill: DRILLS.average };
}
