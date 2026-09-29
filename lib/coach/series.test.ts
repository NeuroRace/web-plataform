import { describe, it, expect } from "vitest";
import {
  longestRunAtOrAbove,
  mean,
  movingAverage,
  round1,
  stdDev,
  thirds,
  windowDeltas,
} from "@/lib/coach/series";

describe("series (NeuroCoach 2.0)", () => {
  it("round1 e mean", () => {
    expect(round1(55.26)).toBe(55.3);
    expect(mean([])).toBeNull();
    expect(mean([40, 60])).toBe(50);
  });

  it("movingAverage usa janela à esquerda e cresce na borda", () => {
    expect(movingAverage([10, 20, 30, 40, 50, 60], 5)).toEqual([10, 15, 20, 25, 30, 40]);
    expect(movingAverage([], 5)).toEqual([]);
  });

  it("thirds divide por índice e manda o resto para o último terço", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(thirds(v)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9, 10]]);
  });

  it("stdDev populacional", () => {
    expect(stdDev([])).toBeNull();
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it("longestRunAtOrAbove devolve a maior sequência (a primeira em caso de empate)", () => {
    expect(longestRunAtOrAbove([70, 70, 10, 60, 60, 60, 5, 61, 62, 63], 60)).toEqual({ start: 3, end: 5, length: 3 });
    expect(longestRunAtOrAbove([10, 20], 60)).toBeNull();
    expect(longestRunAtOrAbove([60, 60], 60)).toEqual({ start: 0, end: 1, length: 2 });
  });

  it("windowDeltas compara com 5 amostras atrás", () => {
    expect(windowDeltas([0, 0, 0, 0, 0, 10, 30], 5)).toEqual([
      { index: 5, delta: 10 },
      { index: 6, delta: 30 },
    ]);
    expect(windowDeltas([1, 2, 3], 5)).toEqual([]);
  });
});
