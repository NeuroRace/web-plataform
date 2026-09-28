import { describe, it, expect } from "vitest";
import { DRILLS, chooseGoal, type GoalInput } from "@/lib/coach/goal";

const base: GoalInput = {
  thirds: [55, 55, 55],
  bestStreakSeconds: 12,
  volatility: 5,
  worstDrop: -8,
  avgAttention: 57.4,
};

describe("chooseGoal — spec §4.7, primeira regra que casar", () => {
  it("terço final: queda >= 10 do início ao fim", () => {
    expect(chooseGoal({ ...base, thirds: [70, 55, 50] })).toEqual({
      kind: "final_third", current: 50, target: 58, unit: "pts", drill: DRILLS.final_third,
    });
  });

  it("sequência: melhor sequência < 10 s → +30% (mínimo +3 s)", () => {
    expect(chooseGoal({ ...base, bestStreakSeconds: 4 })).toMatchObject({ kind: "streak", current: 4, target: 7, unit: "s" });
    expect(chooseGoal({ ...base, bestStreakSeconds: 0 })).toMatchObject({ current: 0, target: 3 });
    expect(chooseGoal({ ...base, bestStreakSeconds: 9 })).toMatchObject({ current: 9, target: 12 });
  });

  it("estabilidade: volatilidade >= 15 → reduzir a pior queda em 30%", () => {
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: -40 })).toEqual({
      kind: "stability", current: 40, target: 28, unit: "pts", drill: DRILLS.stability,
    });
  });

  it("estabilidade exige uma queda de verdade; senão cai na média", () => {
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: 3 })).toMatchObject({ kind: "average" });
    expect(chooseGoal({ ...base, volatility: 18, worstDrop: null })).toMatchObject({ kind: "average" });
  });

  it("média: +5 pts, teto 100", () => {
    expect(chooseGoal(base)).toEqual({ kind: "average", current: 57, target: 62, unit: "pts", drill: DRILLS.average });
    expect(chooseGoal({ ...base, avgAttention: 98 })).toMatchObject({ current: 98, target: 100 });
  });

  it("todo exercício tem título e passos", () => {
    for (const d of Object.values(DRILLS)) {
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.steps.length).toBeGreaterThan(20);
    }
  });
});
