import { describe, it, expect } from "vitest";
import { analyzeRace, MIN_SAMPLES } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

// Série de referência (índice = segundo): 5×40, 12×70, 6×20, 7×75.
// Calculado à mão: MA5 >= 60 de 8 a 17 (10 amostras); d5 mínimo −50 em 21, máximo +55 em 27;
// terços 55 / 55 / 58,5.
const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("analyzeRace — qualidade (spec §4.1)", () => {
  it(`menos de ${MIN_SAMPLES} amostras → insufficient, sem arquétipo, momentos nem meta`, () => {
    const race = makeRace(flat(60, 9));
    const f = analyzeRace(race, [race]);
    expect(f.quality).toBe("insufficient");
    expect(f.sampleCount).toBe(9);
    expect(f.archetype).toBeNull();
    expect(f.moments).toEqual([]);
    expect(f.goal).toBeNull();
    expect(f.metrics.thirds).toBeNull();
    expect(f.badges).toEqual(["PRIMEIRA_CORRIDA"]);
  });

  it("corrida sem nenhuma amostra também é insufficient", () => {
    const race = makeRace([]);
    expect(analyzeRace(race, [race])).toMatchObject({ quality: "insufficient", sampleCount: 0 });
  });
});

describe("analyzeRace — métricas e momentos (spec §4.2/§4.3)", () => {
  const race = makeRace(M);
  const f = analyzeRace(race, [race]);

  it("métricas", () => {
    expect(f.quality).toBe("ok");
    expect(f.sampleCount).toBe(30);
    expect(f.metrics.thirds).toEqual([55, 55, 58.5]);
    expect(f.metrics.bestStreakSeconds).toBe(10);
    expect(f.metrics.avgAttention).toBe(race.metrics.avgAttention);
  });

  it("momentos: sequência 8–17, queda −50 aos 21 s e recuperação +55 aos 27 s, em ordem de tempo", () => {
    expect(f.moments).toEqual([
      { kind: "streak", t: 8, tEnd: 17, value: 10 },
      { kind: "drop", t: 21, value: -50 },
      { kind: "rise", t: 27, value: 55 },
    ]);
  });

  it("badge de virada (recuperação ≥ 45)", () => {
    expect(f.badges).toContain("VIRADA_MENTAL");
  });

  it("pico entra quando há menos de 3 momentos", () => {
    const series = flat(50, 20);
    series[7] = 90;
    const r = makeRace(series);
    expect(analyzeRace(r, [r]).moments).toEqual([{ kind: "peak", t: 7, value: 90 }]);
  });

  it("pico dentro da melhor sequência não vira momento separado (marcador duplicado)", () => {
    const r = makeRace([...flat(68, 15), ...flat(55, 15), ...flat(42, 15)]);
    expect(analyzeRace(r, [r]).moments).toEqual([{ kind: "streak", t: 0, tEnd: 17, value: 18 }]);
  });

  it("momento a até 2 s de outro já escolhido não entra (marcadores sobrepostos no replay)", () => {
    // Rampa 20→80: a maior subida (aos 19 s) coincide com o início da sequência (18 s).
    const r = makeRace([...flat(20, 15), ...flat(80, 20)]);
    expect(analyzeRace(r, [r]).moments).toEqual([
      { kind: "peak", t: 15, value: 80 },
      { kind: "streak", t: 18, tEnd: 34, value: 17 },
    ]);
  });

  it("leituras nulas são ignoradas e os momentos mantêm o segundo real", () => {
    const withNulls: Array<number | null> = [null, null, ...M];
    const r = makeRace(withNulls);
    const moments = analyzeRace(r, [r]).moments;
    expect(moments.map((m) => m.t)).toEqual([10, 23, 29]);
  });

  it("é determinístico", () => {
    expect(analyzeRace(race, [race])).toEqual(analyzeRace(race, [race]));
  });
});

describe("analyzeRace — arquétipo ponta a ponta", () => {
  it.each<[string, number[], number, string]>([
    ["em aquecimento", flat(40, 30), 50, "EM_AQUECIMENTO"],
    ["hiperfocado", flat(70, 30), 50, "HIPERFOCADO"],
    ["arranque crescente", [...flat(45, 10), ...flat(50, 10), ...flat(60, 10)], 50, "ARRANQUE_CRESCENTE"],
    ["sprinter", [...flat(60, 10), ...flat(50, 10), ...flat(45, 10)], 50, "SPRINTER"],
    ["oscilador", Array.from({ length: 30 }, (_, i) => (i % 10 < 5 ? 80 : 25)), 50, "OSCILADOR"],
    ["mestre zen", flat(55, 30), 60, "MESTRE_ZEN"],
    ["equilibrado", flat(55, 30), 50, "EQUILIBRADO"],
  ])("%s", (_, attention, meditation, expected) => {
    const r = makeRace(attention, { meditation });
    expect(analyzeRace(r, [r]).archetype).toBe(expected);
  });
});

describe("analyzeRace — progresso (spec §4.6)", () => {
  const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z", durationSeconds: 70 });
  const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z", durationSeconds: 60 });
  const r3 = makeRace(flat(55, 20), { id: "r3", startedAt: "2026-09-30T17:20:00.000Z", durationSeconds: 65 });
  const history = [r3, r1, r2]; // fora de ordem de propósito

  it("primeira corrida: sem anterior, badge de primeira", () => {
    const f = analyzeRace(r1, history);
    expect(f.progress).toEqual({ raceNumber: 1, totalRaces: 3, previous: null, personalBest: { attention: false, time: false } });
    expect(f.badges).toContain("PRIMEIRA_CORRIDA");
  });

  it("segunda corrida: melhorou foco e tempo → recorde pessoal", () => {
    const f = analyzeRace(r2, history);
    expect(f.progress).toEqual({
      raceNumber: 2, totalRaces: 3,
      previous: { attentionDelta: 10, durationDelta: -10 },
      personalBest: { attention: true, time: true },
    });
    expect(f.badges).toContain("RECORDE_PESSOAL");
  });

  it("terceira corrida: piorou em relação à anterior e não é recorde", () => {
    const f = analyzeRace(r3, history);
    expect(f.progress.previous).toEqual({ attentionDelta: -5, durationDelta: 5 });
    expect(f.progress.personalBest).toEqual({ attention: false, time: false });
    expect(f.badges).not.toContain("RECORDE_PESSOAL");
  });

  it("corrida sem finished_at: durationDelta nulo e sem recorde de tempo", () => {
    const open = makeRace(flat(70, 20), { id: "r4", startedAt: "2026-09-30T17:30:00.000Z", durationSeconds: null });
    const f = analyzeRace(open, [...history, open]);
    expect(f.progress.previous).toEqual({ attentionDelta: 15, durationDelta: null });
    expect(f.progress.personalBest).toEqual({ attention: true, time: false });
  });

  it("empate de startedAt: ordem estável por id", () => {
    const a = makeRace(flat(50, 20), { id: "a", startedAt: "2026-09-30T18:00:00.000Z" });
    const b = makeRace(flat(50, 20), { id: "b", startedAt: "2026-09-30T18:00:00.000Z" });
    expect(analyzeRace(b, [b, a]).progress.raceNumber).toBe(2);
    expect(analyzeRace(a, [b, a]).progress.raceNumber).toBe(1);
  });

  it("a meta vem do motor quando a qualidade é ok", () => {
    const f = analyzeRace(makeRace(M), [makeRace(M)]);
    expect(f.goal).not.toBeNull();
  });
});
