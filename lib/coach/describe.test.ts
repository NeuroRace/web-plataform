import { describe, it, expect } from "vitest";
import { describeGoal, describeMoment, formatClock, formatDecimal, MOMENT_SYMBOLS } from "@/lib/coach/describe";
import { DRILLS } from "@/lib/coach/goal";

describe("describe (NeuroCoach 2.0)", () => {
  it("formatClock e formatDecimal", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
    expect(formatDecimal(-3.2)).toBe("-3,2");
    expect(MOMENT_SYMBOLS).toEqual(["①", "②", "③"]);
  });

  it("describeMoment", () => {
    expect(describeMoment({ kind: "streak", t: 8, tEnd: 17, value: 10 })).toBe("0:08–0:17 · 10 s seguidos em foco alto");
    expect(describeMoment({ kind: "drop", t: 21, value: -50 })).toBe("0:21 · o foco caiu 50 pts em 5 s");
    expect(describeMoment({ kind: "rise", t: 27, value: 55 })).toBe("0:27 · recuperou 55 pts de foco em 5 s");
    expect(describeMoment({ kind: "peak", t: 7, value: 90 })).toBe("0:07 · pico de atenção: 90");
  });

  it("describeGoal", () => {
    expect(describeGoal({ kind: "final_third", current: 50, target: 58, unit: "pts", drill: DRILLS.final_third }))
      .toBe("Chegue ao terço final com foco médio de 58 (hoje: 50)");
    expect(describeGoal({ kind: "streak", current: 4, target: 7, unit: "s", drill: DRILLS.streak }))
      .toBe("Segure o foco alto por 7 s seguidos (hoje: 4 s)");
    expect(describeGoal({ kind: "stability", current: 40, target: 28, unit: "pts", drill: DRILLS.stability }))
      .toBe("Evite quedas de foco maiores que 28 pts em 5 s (hoje: 40)");
    expect(describeGoal({ kind: "average", current: 57, target: 62, unit: "pts", drill: DRILLS.average }))
      .toBe("Suba seu foco médio para 62 (hoje: 57)");
  });
});
