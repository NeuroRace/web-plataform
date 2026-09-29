import { describe, expect, it } from "vitest";
import { buildArchetypeCard, buildShareCard } from "@/lib/share-card";
import type { RaceSummary } from "@/lib/metrics";
import { flat, makeRace } from "@/lib/coach/test-utils";

function race(id: string, over: Partial<RaceSummary["metrics"]> = {}): RaceSummary {
  return {
    racePlayerId: id,
    raceId: `r-${id}`,
    startedAt: "2026-09-30T13:00:00.000Z",
    finishedAt: "2026-09-30T13:01:10.000Z",
    slot: 1,
    series: [],
    metrics: {
      avgAttention: 60,
      peakAttention: 90,
      focusZonePct: 40,
      avgMeditation: 50,
      durationSeconds: 70,
      sampleCount: 70,
      ...over,
    },
  };
}

const leaderboard = [
  { rank: 1, display_name: "Luna", score: 58.4 },
  { rank: 2, display_name: "Breq", score: 61.2 },
  { rank: 3, display_name: "Davi", score: 66.0 },
];

describe("buildShareCard", () => {
  it("usa o tempo e a posição do ranking quando a pessoa está nele", () => {
    const card = buildShareCard({ displayName: "Breq", races: [race("a")], leaderboard });
    expect(card).toMatchObject({ name: "Breq", bestTime: 61.2, rank: 2, races: 1 });
  });

  it("acha o apelido sem diferenciar maiúsculas (citext no banco)", () => {
    const card = buildShareCard({ displayName: "BREQ", races: [race("a")], leaderboard });
    expect(card.rank).toBe(2);
  });

  it("fora do ranking: sem posição, melhor tempo vem das próprias corridas", () => {
    const card = buildShareCard({
      displayName: "Novato",
      races: [race("a", { durationSeconds: 80 }), race("b", { durationSeconds: 72.5 })],
      leaderboard,
    });
    expect(card.rank).toBeNull();
    expect(card.bestTime).toBe(72.5);
  });

  it("sem apelido: nome genérico e sem posição", () => {
    const card = buildShareCard({ displayName: null, races: [race("a")], leaderboard });
    expect(card.name).toBe("Jogador NeuroRace");
    expect(card.rank).toBeNull();
  });

  it("ignora duração nula ou zero no melhor tempo", () => {
    const card = buildShareCard({
      displayName: null,
      races: [race("a", { durationSeconds: null }), race("b", { durationSeconds: 0 })],
      leaderboard: [],
    });
    expect(card.bestTime).toBeNull();
  });

  it("foco médio é a média das corridas com amostra, arredondada", () => {
    const card = buildShareCard({
      displayName: null,
      races: [race("a", { avgAttention: 61 }), race("b", { avgAttention: 70 }), race("c", { avgAttention: null })],
      leaderboard: [],
    });
    expect(card.avgFocus).toBe(66);
    expect(card.races).toBe(3);
  });
});

describe("buildArchetypeCard", () => {
  it("usa a corrida mais recente com dados: arquétipo e badges do NeuroCoach", () => {
    const old = makeRace(flat(40, 30), { id: "old", startedAt: "2026-09-30T12:00:00.000Z" });
    const last = makeRace(flat(70, 40), { id: "last", startedAt: "2026-09-30T13:00:00.000Z" });
    const card = buildArchetypeCard({ displayName: "Breq", races: [old, last], leaderboard });

    expect(card?.archetype).toMatchObject({ id: "HIPERFOCADO", label: "Hiperfocado" });
    expect(card?.race).toMatchObject({ avgFocus: 70, durationSeconds: 40, raceNumber: 2 });
    const ids = card?.badges.map((b) => b.id);
    // foco 70 no 1º terço, estável, 100% na zona, fim = começo, e melhor que a corrida anterior
    expect(ids).toEqual(
      expect.arrayContaining(["LARGADA_RELAMPAGO", "MENTE_DE_ACO", "MODO_FLOW", "FADIGA_ZERO", "RECORDE_PESSOAL"]),
    );
    expect(card?.rank).toBe(2);
  });

  it("corrida recente sem dados suficientes: cai na anterior que tem", () => {
    const ok = makeRace(flat(50, 30), { id: "ok", startedAt: "2026-09-30T12:00:00.000Z" });
    const poor = makeRace(flat(70, 4), { id: "poor", startedAt: "2026-09-30T13:00:00.000Z" });
    const card = buildArchetypeCard({ displayName: null, races: [ok, poor], leaderboard: [] });
    expect(card?.archetype.id).toBe("EQUILIBRADO");
    expect(card?.race.raceNumber).toBe(1);
    expect(card?.badges.map((b) => b.id)).toContain("PRIMEIRA_CORRIDA");
  });

  it("nenhuma corrida com dados suficientes: sem card de arquétipo", () => {
    const poor = makeRace(flat(70, 4), { id: "poor" });
    expect(buildArchetypeCard({ displayName: null, races: [poor], leaderboard: [] })).toBeNull();
  });

  it("no máximo 6 badges no card", () => {
    const last = makeRace(flat(70, 40), { id: "last", meditation: 60 });
    const card = buildArchetypeCard({ displayName: null, races: [last], leaderboard: [] });
    expect(card!.badges.length).toBeLessThanOrEqual(6);
  });
});
