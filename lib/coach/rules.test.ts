import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_INFO,
  BADGE_INFO,
  classifyArchetype,
  historyBadges,
  performanceBadges,
  type RuleInput,
} from "@/lib/coach/rules";

const base: RuleInput = {
  avgAttention: 52,
  avgMeditation: 50,
  thirds: [52, 52, 52],
  volatility: 12,
  focusZonePct: 30,
  bestRise: 10,
};

describe("classifyArchetype — spec §4.4, primeira regra que casar", () => {
  it.each<[string, Partial<RuleInput>, string]>([
    ["média < 45", { avgAttention: 44.9, avgMeditation: 70, volatility: 2 }, "EM_AQUECIMENTO"],
    ["média >= 60", { avgAttention: 60, thirds: [70, 60, 50] }, "HIPERFOCADO"],
    ["terço final >= início + 10", { thirds: [45, 50, 55] }, "ARRANQUE_CRESCENTE"],
    ["início >= terço final + 10", { thirds: [60, 50, 50] }, "SPRINTER"],
    ["volatilidade >= 15", { volatility: 15 }, "OSCILADOR"],
    ["calma >= 55 e volatilidade < 10", { avgMeditation: 55, volatility: 9.9 }, "MESTRE_ZEN"],
    ["resto", {}, "EQUILIBRADO"],
    ["calma alta mas volátil não é zen", { avgMeditation: 70, volatility: 12 }, "EQUILIBRADO"],
  ])("%s", (_, patch, expected) => {
    expect(classifyArchetype({ ...base, ...patch })).toBe(expected);
  });
});

describe("performanceBadges — spec §4.5", () => {
  it("nenhum badge no caso médio", () => {
    expect(performanceBadges({ ...base, thirds: [52, 52, 50] })).toEqual([]);
  });

  it("todos os de desempenho, na ordem da spec", () => {
    expect(
      performanceBadges({
        avgAttention: 62,
        avgMeditation: 55,
        thirds: [60, 62, 64],
        volatility: 10,
        focusZonePct: 50,
        bestRise: 45,
      }),
    ).toEqual(["LARGADA_RELAMPAGO", "MENTE_DE_ACO", "VIRADA_MENTAL", "MODO_FLOW", "CALMA_TOTAL", "FADIGA_ZERO"]);
  });

  it("limiares são inclusivos e param logo abaixo", () => {
    expect(performanceBadges({ ...base, thirds: [59.9, 50, 50] })).not.toContain("LARGADA_RELAMPAGO");
    expect(performanceBadges({ ...base, volatility: 10.1 })).not.toContain("MENTE_DE_ACO");
    expect(performanceBadges({ ...base, bestRise: 44.9 })).not.toContain("VIRADA_MENTAL");
    expect(performanceBadges({ ...base, bestRise: null })).not.toContain("VIRADA_MENTAL");
    expect(performanceBadges({ ...base, focusZonePct: null })).not.toContain("MODO_FLOW");
    expect(performanceBadges({ ...base, avgMeditation: null })).not.toContain("CALMA_TOTAL");
  });
});

describe("historyBadges", () => {
  it("primeira corrida", () => {
    expect(historyBadges(1, { attention: false, time: false })).toEqual(["PRIMEIRA_CORRIDA"]);
  });
  it("recorde pessoal a partir da 2ª corrida", () => {
    expect(historyBadges(2, { attention: true, time: false })).toEqual(["RECORDE_PESSOAL"]);
    expect(historyBadges(3, { attention: false, time: true })).toEqual(["RECORDE_PESSOAL"]);
    expect(historyBadges(3, { attention: false, time: false })).toEqual([]);
  });
});

describe("rótulos", () => {
  it("todo arquétipo e badge tem rótulo e descrição em pt-BR", () => {
    for (const info of Object.values(ARCHETYPE_INFO)) {
      expect(info.label.length).toBeGreaterThan(3);
      expect(info.description.length).toBeGreaterThan(10);
    }
    for (const info of Object.values(BADGE_INFO)) {
      expect(info.label.length).toBeGreaterThan(3);
      expect(info.icon.length).toBeGreaterThan(0);
    }
  });
});
