import { describe, expect, it } from "vitest";
import {
  buildPodium,
  formatClock,
  formatRaceTime,
  initials,
  isNewLeader,
} from "./telao";

const row = (rank: number, display_name: string, score = 20 + rank) => ({
  rank,
  display_name,
  score,
});

describe("formatClock", () => {
  it("H:MM:SS com zero à esquerda em minutos e segundos", () => {
    expect(formatClock(5077_000)).toBe("1:24:37");
    expect(formatClock(65_000)).toBe("0:01:05");
  });

  it("trunca os segundos: 1,9 s restando mostra 0:00:01", () => {
    expect(formatClock(1_900)).toBe("0:00:01");
    expect(formatClock(999)).toBe("0:00:00");
  });

  it("rodada encerrada ou relógio adiantado não fica negativo", () => {
    expect(formatClock(0)).toBe("0:00:00");
    expect(formatClock(-5_000)).toBe("0:00:00");
  });
});

describe("formatRaceTime", () => {
  it("abaixo de 1 min: uma casa decimal com vírgula", () => {
    expect(formatRaceTime(12.9)).toBe("12,9 s");
    expect(formatRaceTime(9.74)).toBe("9,7 s");
    expect(formatRaceTime(30)).toBe("30,0 s");
  });

  it("a partir de 1 min: M:SS,d", () => {
    expect(formatRaceTime(65.3)).toBe("1:05,3");
    expect(formatRaceTime(125)).toBe("2:05,0");
  });

  it("arredonda o total antes de separar os minutos (59,96 vira 1:00,0, não 60,0 s)", () => {
    expect(formatRaceTime(59.96)).toBe("1:00,0");
  });
});

describe("initials", () => {
  it("duas primeiras letras, ignorando dígitos e símbolos", () => {
    expect(initials("luna_zen")).toBe("LU");
    expect(initials("caio.f")).toBe("CA");
    expect(initials("Léo")).toBe("LÉ");
    expect(initials("x_9_y")).toBe("XY");
  });

  it("apelido sem letras vira #", () => {
    expect(initials("42")).toBe("#");
  });
});

describe("buildPodium", () => {
  it("ordem visual 2º, 1º, 3º e o resto do 4º ao 9º", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, `p${i + 1}`));
    const { podium, rest } = buildPodium(rows);

    expect(podium.map((s) => [s.place, s.row?.display_name])).toEqual([
      [2, "p2"],
      [1, "p1"],
      [3, "p3"],
    ]);
    expect(rest.map((r) => r.rank)).toEqual([4, 5, 6, 7, 8, 9]);
  });

  it("com menos de 3 corridas, as posições vazias vêm sem jogador", () => {
    const { podium, rest } = buildPodium([row(1, "Ana")]);
    expect(podium.map((s) => s.row?.display_name ?? null)).toEqual([null, "Ana", null]);
    expect(rest).toEqual([]);
  });
});

describe("isNewLeader", () => {
  const r2 = (name: string | null) => ({ windowId: "r2", name });

  it("outra pessoa assume o 1º na mesma rodada: celebra", () => {
    expect(isNewLeader(r2("Ana"), r2("Theo"))).toBe(true);
  });

  it("1ª corrida de uma rodada vazia: celebra", () => {
    expect(isNewLeader(r2(null), r2("Ana"))).toBe(true);
  });

  it("mesmo líder (inclusive melhorando o próprio tempo): não celebra", () => {
    expect(isNewLeader(r2("Ana"), r2("Ana"))).toBe(false);
  });

  it("primeira leitura, troca de rodada ou sem rodada: não celebra", () => {
    expect(isNewLeader(null, r2("Ana"))).toBe(false);
    expect(isNewLeader({ windowId: "r1", name: "Ana" }, r2("Theo"))).toBe(false);
    expect(isNewLeader(r2("Ana"), null)).toBe(false);
    expect(isNewLeader(r2("Ana"), r2(null))).toBe(false);
  });
});
