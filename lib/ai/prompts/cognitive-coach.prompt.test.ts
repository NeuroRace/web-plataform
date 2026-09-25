import { describe, it, expect } from "vitest";
import type { RaceSummary } from "@/lib/metrics";
import { extractCognitiveFeatures } from "@/lib/ai/feature-extractor";
import { buildCognitiveUserPrompt } from "@/lib/ai/prompts/cognitive-coach.prompt";

// NEU-103 / ADR 0003 §6: o que vai para o provedor de IA são só agregados,
// sem nada que identifique o jogador ou a corrida.
function summary(overrides: Partial<RaceSummary>): RaceSummary {
  return {
    racePlayerId: "rp-7f3a9c11-identificador",
    raceId: "race-2b8e44d0-identificador",
    slot: 1,
    startedAt: "2026-08-28T15:04:05.000Z",
    finishedAt: "2026-08-28T15:05:07.000Z",
    metrics: {
      avgAttention: 64.2,
      peakAttention: 92,
      focusZonePct: 61.7,
      avgMeditation: 48,
      durationSeconds: 62.4,
      sampleCount: 3,
    },
    series: [
      { t: 0, attention: 70, meditation: 50 },
      { t: 30, attention: 60, meditation: 47 },
      { t: 60, attention: 55, meditation: 46 },
    ],
    ...overrides,
  };
}

describe("prompt da IA Coach não carrega identificadores", () => {
  const player = summary({});
  const opponent = summary({
    racePlayerId: "rp-oponente-identificador",
    slot: 2,
  });
  const prompt = buildCognitiveUserPrompt(extractCognitiveFeatures(player, opponent));

  it.each([
    ["id do race_player", player.racePlayerId],
    ["id da corrida", player.raceId],
    ["id do oponente", opponent.racePlayerId],
    ["horário de início", player.startedAt],
    ["horário de fim", player.finishedAt as string],
    ["data da corrida", "2026-08-28"],
  ])("não inclui %s", (_label, value) => {
    expect(prompt).not.toContain(value);
  });

  it("não inclui e-mail", () => {
    expect(prompt).not.toMatch(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  });

  it("inclui as métricas agregadas", () => {
    expect(prompt).toContain("64.2");
    expect(prompt).toContain("Início (0-33%)");
  });
});
