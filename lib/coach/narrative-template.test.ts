import { describe, it, expect } from "vitest";
import { analyzeRace } from "@/lib/coach/analyze";
import { BANNED_TERMS, templateNarrative } from "@/lib/coach/narrative-template";
import { flat, makeRace } from "@/lib/coach/test-utils";

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("templateNarrative (spec §5.1)", () => {
  it("usa arquétipo, média, o momento mais marcante e a primeira corrida", () => {
    const race = makeRace(M);
    const n = templateNarrative(analyzeRace(race, [race]));
    expect(n.source).toBe("template");
    expect(n.headline).toBe("Foco em altos e baixos: picos rápidos e quedas rápidas");
    expect(n.summary).toContain("Seu índice médio de atenção foi 56");
    expect(n.summary).toContain("de 0:08 a 0:17, 10 s seguidos com foco alto");
    expect(n.summary).toContain("primeira corrida");
  });

  it("menciona a evolução quando há corrida anterior", () => {
    const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z" });
    const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z" });
    expect(templateNarrative(analyzeRace(r2, [r1, r2])).summary).toContain("seu foco médio subiu 10 pontos");
  });

  it("manchetes não afirmam mais do que a regra do arquétipo garante", () => {
    const headline = (attention: number[]) => {
      const r = makeRace(attention);
      return templateNarrative(analyzeRace(r, [r])).headline;
    };
    // HIPERFOCADO = média >= 60 (não "quase toda a corrida")
    expect(headline(flat(70, 30))).toBe("Foco alto na média da corrida");
    // SPRINTER = início >= fim + 10 (não necessariamente "largada forte")
    expect(headline([...flat(52, 10), ...flat(46, 10), ...flat(42, 10)])).toBe("Começou mais focado do que terminou");
    // EQUILIBRADO pode ter uma queda pontual (não "sem grandes quedas")
    expect(headline(flat(55, 30))).toBe("Foco parecido do começo ao fim da corrida");
  });

  it("insufficient explica o problema do sensor", () => {
    const race = makeRace(flat(60, 9));
    const n = templateNarrative(analyzeRace(race, [race]));
    expect(n.headline).toBe("Corrida com poucos dados do sensor");
    expect(n.summary).toContain("só 9 leituras");
  });

  it("todo texto-modelo respeita tamanho e termos proibidos", () => {
    const series = [
      flat(40, 30), flat(70, 30), [...flat(45, 10), ...flat(50, 10), ...flat(60, 10)],
      [...flat(60, 10), ...flat(50, 10), ...flat(45, 10)], M, flat(55, 30), flat(60, 3),
    ];
    for (const s of series) {
      for (const meditation of [50, 60]) {
        const r = makeRace(s, { meditation });
        const n = templateNarrative(analyzeRace(r, [r]));
        expect(n.headline.length).toBeGreaterThanOrEqual(10);
        expect(n.headline.length).toBeLessThanOrEqual(80);
        expect(n.summary.length).toBeGreaterThanOrEqual(40);
        expect(n.summary.length).toBeLessThanOrEqual(400);
        expect(`${n.headline} ${n.summary}`).not.toMatch(BANNED_TERMS);
      }
    }
  });
});
