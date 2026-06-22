import { describe, it, expect } from "vitest";
import { makeDemoSeries, isInFocusZone } from "@/lib/signal";

describe("makeDemoSeries", () => {
  it("gera o número pedido de pontos com t sequencial", () => {
    const s = makeDemoSeries({ points: 10, seed: 1 });
    expect(s).toHaveLength(10);
    expect(s.map((p) => p.t)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("é determinístico para o mesmo seed (SSR === CSR)", () => {
    const a = makeDemoSeries({ points: 30, seed: 42 });
    const b = makeDemoSeries({ points: 30, seed: 42 });
    expect(a).toEqual(b);
  });

  it("difere com seeds diferentes", () => {
    const a = makeDemoSeries({ points: 30, seed: 1 });
    const b = makeDemoSeries({ points: 30, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("mantém attention/meditation entre 0 e 100 e não-nulos", () => {
    const s = makeDemoSeries({ points: 100, seed: 7 });
    for (const p of s) {
      expect(p.attention).not.toBeNull();
      expect(p.meditation).not.toBeNull();
      expect(p.attention as number).toBeGreaterThanOrEqual(0);
      expect(p.attention as number).toBeLessThanOrEqual(100);
      expect(p.meditation as number).toBeGreaterThanOrEqual(0);
      expect(p.meditation as number).toBeLessThanOrEqual(100);
    }
  });

  it("usa 60 pontos por padrão", () => {
    expect(makeDemoSeries()).toHaveLength(60);
  });
});

describe("isInFocusZone", () => {
  it("retorna false para null", () => {
    expect(isInFocusZone(null, 60)).toBe(false);
  });
  it("retorna true no limiar ou acima", () => {
    expect(isInFocusZone(60, 60)).toBe(true);
    expect(isInFocusZone(85, 60)).toBe(true);
  });
  it("retorna false abaixo do limiar", () => {
    expect(isInFocusZone(59, 60)).toBe(false);
  });
});
