import { describe, expect, it } from "vitest";
import {
  formatRemaining,
  formatWindowRange,
  resolveWindows,
  type RankingWindow,
} from "./ranking";

const w = (id: string, starts_at: string, ends_at: string): RankingWindow => ({
  id,
  name: `Rodada ${id}`,
  starts_at,
  ends_at,
});

// Horários em -03:00 (fuso do evento).
const r1 = w("1", "2026-09-30T10:00:00-03:00", "2026-09-30T12:00:00-03:00");
const r2 = w("2", "2026-09-30T12:00:00-03:00", "2026-09-30T14:00:00-03:00");
const r3 = w("3", "2026-09-30T14:00:00-03:00", "2026-09-30T16:00:00-03:00");
const at = (iso: string) => new Date(iso);

describe("resolveWindows", () => {
  it("sem rodadas devolve null (a UI cai no ranking geral)", () => {
    expect(resolveWindows([], at("2026-09-30T11:00:00-03:00"))).toBeNull();
  });

  it("acha a rodada atual e a anterior, e o início do evento é a primeira rodada", () => {
    const r = resolveWindows([r3, r1, r2], at("2026-09-30T12:30:00-03:00"));
    expect(r?.current?.id).toBe("2");
    expect(r?.previous?.id).toBe("1");
    expect(r?.eventStart).toBe(r1.starts_at);
  });

  it("ends_at é exclusivo: no minuto da virada já vale a rodada seguinte", () => {
    const r = resolveWindows([r1, r2], at("2026-09-30T12:00:00-03:00"));
    expect(r?.current?.id).toBe("2");
    expect(r?.previous?.id).toBe("1");
  });

  it("antes da primeira rodada não há atual nem anterior", () => {
    const r = resolveWindows([r1, r2], at("2026-09-30T09:00:00-03:00"));
    expect(r?.current).toBeNull();
    expect(r?.previous).toBeNull();
  });

  it("no intervalo entre rodadas, sem atual, com a anterior", () => {
    const gap = w("g", "2026-09-30T15:00:00-03:00", "2026-09-30T17:00:00-03:00");
    const r = resolveWindows([r1, gap], at("2026-09-30T13:00:00-03:00"));
    expect(r?.current).toBeNull();
    expect(r?.previous?.id).toBe("1");
  });

  it("ignora rodada com fim antes do início (cadastro errado)", () => {
    const bad = w("x", "2026-09-30T12:00:00-03:00", "2026-09-30T11:00:00-03:00");
    expect(resolveWindows([bad], at("2026-09-30T11:30:00-03:00"))).toBeNull();
  });
});

describe("formatRemaining", () => {
  it.each([
    [0, "encerrada"],
    [-5_000, "encerrada"],
    [30_000, "menos de 1 min"],
    [12 * 60_000 + 59_000, "12min"],
    [65 * 60_000, "1h 05min"],
    [2 * 3_600_000, "2h 00min"],
  ])("%i ms → %s", (ms, text) => {
    expect(formatRemaining(ms)).toBe(text);
  });
});

describe("formatWindowRange", () => {
  it("mostra o horário no fuso de São Paulo", () => {
    expect(formatWindowRange(r2)).toBe("12:00–14:00");
  });
});
