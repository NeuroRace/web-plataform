import { describe, it, expect } from "vitest";
import { DEMO_RACE } from "@/lib/coach/demo";
import { analyzeLocally } from "@/lib/coach/local";

describe("modo demo (?demo=true) — análise no cliente, sem servidor nem IA", () => {
  it("a corrida demo tem dados suficientes e gera o card completo com texto-modelo", () => {
    const res = analyzeLocally(DEMO_RACE, [DEMO_RACE]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.facts.quality).toBe("ok");
    expect(res.facts.archetype).not.toBeNull();
    expect(res.facts.moments.length).toBeGreaterThan(0);
    expect(res.facts.goal).not.toBeNull();
    expect(res.narrative.source).toBe("template");
  });
});
