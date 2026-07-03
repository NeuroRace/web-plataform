import { describe, it, expect } from "vitest";
import {
  computeMetrics,
  buildSeries,
  buildRaceSummaries,
  formatDuration,
  formatPct,
  formatRaceDate,
  type TelemetryRow,
} from "@/lib/metrics";
import { metricsConfig } from "@/lib/site";

/**
 * Cobre lib/metrics.ts (lógica load-bearing do dashboard, antes sem teste).
 *
 * DETERMINISMO: nada de Date.now()/Math.random()/timers. Usamos strings ISO
 * ABSOLUTAS com sufixo Z — new Date("...Z").getTime() independe do fuso do runner.
 * formatRaceDate usa toLocaleString sem timeZone (depende do fuso do sistema),
 * então só validamos o SHAPE, nunca a string localizada exata.
 */

const T = metricsConfig.focusZoneThreshold;

/** Constrói uma TelemetryRow válida (tipada) sobrescrevendo só o necessário. */
function pt(over: Partial<TelemetryRow>): TelemetryRow {
  return {
    race_player_id: "rp-1",
    t: "2026-01-01T00:00:00Z",
    attention: null,
    meditation: null,
    ...over,
  };
}

describe("metricsConfig (guarda de premissa)", () => {
  it("o threshold da zona de foco é 60 hoje (documenta a premissa dos testes)", () => {
    expect(metricsConfig.focusZoneThreshold).toBe(60);
  });
});

describe("computeMetrics", () => {
  it("array vazio: métricas nulas, duração calculada pelas datas, sampleCount 0", () => {
    const m = computeMetrics([], "2026-01-01T00:00:00Z", "2026-01-01T00:00:10Z");
    expect(m.avgAttention).toBeNull();
    expect(m.peakAttention).toBeNull();
    expect(m.focusZonePct).toBeNull();
    expect(m.avgMeditation).toBeNull();
    expect(m.durationSeconds).toBe(10);
    expect(m.sampleCount).toBe(0);
  });

  it("todos os valores null: avg/peak/focus nulos mas sampleCount conta as linhas", () => {
    const points = [
      pt({ attention: null, meditation: null }),
      pt({ attention: null, meditation: null }),
    ];
    const m = computeMetrics(points, "2026-01-01T00:00:00Z", "2026-01-01T00:00:04Z");
    expect(m.avgAttention).toBeNull();
    expect(m.peakAttention).toBeNull();
    expect(m.focusZonePct).toBeNull();
    expect(m.avgMeditation).toBeNull();
    expect(m.durationSeconds).toBe(4);
    expect(m.sampleCount).toBe(2);
  });

  it("um único ponto: avg == peak == valor, focusZone conforme o threshold", () => {
    const m = computeMetrics(
      [pt({ attention: 80, meditation: 30 })],
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:03Z",
    );
    expect(m.avgAttention).toBe(80);
    expect(m.peakAttention).toBe(80);
    expect(m.avgMeditation).toBe(30);
    expect(m.focusZonePct).toBe(100);
    expect(m.durationSeconds).toBe(3);
    expect(m.sampleCount).toBe(1);
  });

  it("avg/peak ignoram null (mistura de null e números)", () => {
    const points = [
      pt({ attention: 40, meditation: null }),
      pt({ attention: null, meditation: 80 }),
      pt({ attention: 60, meditation: 20 }),
    ];
    const m = computeMetrics(points, "2026-01-01T00:00:00Z", null);
    // att = [40, 60] -> avg 50, peak 60 ; med = [80, 20] -> avg 50
    expect(m.avgAttention).toBe(50);
    expect(m.peakAttention).toBe(60);
    expect(m.avgMeditation).toBe(50);
    expect(m.sampleCount).toBe(3);
  });

  it("attention/meditation = 0 são valores VÁLIDOS (0 != null): entram na média/peak", () => {
    // Guarda anti-regressão: o filtro é `v != null`, não truthiness. Se alguém
    // trocar por `filter(v => v)`, o 0 (perda de sinal no NeuroSky, range 0-100)
    // sumiria da média e estes asserts falhariam.
    const points = [pt({ attention: 0, meditation: 0 }), pt({ attention: 100, meditation: 50 })];
    const m = computeMetrics(points, "2026-01-01T00:00:00Z", null);
    // att = [0, 100] -> avg 50, peak 100 ; med = [0, 50] -> avg 25
    expect(m.avgAttention).toBe(50);
    expect(m.peakAttention).toBe(100);
    expect(m.avgMeditation).toBe(25);
    expect(m.sampleCount).toBe(2);
    // só o 100 está >= 60 -> 50% na zona de foco
    expect(m.focusZonePct).toBe(50);
  });

  it("focusZonePct: BOUNDARY do threshold — 59 fora, 60 dentro (>=), 61 dentro", () => {
    const below = computeMetrics([pt({ attention: T - 1 })], "2026-01-01T00:00:00Z", null);
    const at = computeMetrics([pt({ attention: T })], "2026-01-01T00:00:00Z", null);
    const above = computeMetrics([pt({ attention: T + 1 })], "2026-01-01T00:00:00Z", null);
    expect(below.focusZonePct).toBe(0); // 59 NÃO conta
    expect(at.focusZonePct).toBe(100); // 60 conta (inclusivo)
    expect(above.focusZonePct).toBe(100); // 61 conta
  });

  it("focusZonePct: metade dentro (59 fora, 60 dentro) == 50%", () => {
    const m = computeMetrics(
      [pt({ attention: T - 1 }), pt({ attention: T })],
      "2026-01-01T00:00:00Z",
      null,
    );
    expect(m.focusZonePct).toBe(50);
  });

  it("durationSeconds: null quando falta finishedAt", () => {
    const m = computeMetrics([pt({ attention: 50 })], "2026-01-01T00:00:00Z", null);
    expect(m.durationSeconds).toBeNull();
  });

  it("durationSeconds: null quando falta startedAt", () => {
    const m = computeMetrics([pt({ attention: 50 })], "", "2026-01-01T00:00:10Z");
    expect(m.durationSeconds).toBeNull();
  });

  it("durationSeconds: (finished-started)/1000, inclusive fração de segundo", () => {
    const m = computeMetrics(
      [pt({ attention: 50 })],
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:02:05.500Z",
    );
    expect(m.durationSeconds).toBe(125.5);
  });
});

describe("buildSeries", () => {
  it("array vazio -> []", () => {
    expect(buildSeries([], "2026-01-01T00:00:00Z")).toEqual([]);
  });

  it("ordena por t crescente (prova o sort) e converte para segundos desde o início", () => {
    const points = [
      pt({ t: "2026-01-01T00:00:10Z", attention: 10, meditation: 1 }),
      pt({ t: "2026-01-01T00:00:00Z", attention: 20, meditation: 2 }),
      pt({ t: "2026-01-01T00:00:05Z", attention: 30, meditation: 3 }),
    ];
    const series = buildSeries(points, "2026-01-01T00:00:00Z");
    expect(series).toEqual([
      { t: 0, attention: 20, meditation: 2 },
      { t: 5, attention: 30, meditation: 3 },
      { t: 10, attention: 10, meditation: 1 },
    ]);
  });

  it("não muta o array de entrada (usa slice antes de ordenar)", () => {
    const points = [
      pt({ t: "2026-01-01T00:00:10Z", attention: 10 }),
      pt({ t: "2026-01-01T00:00:00Z", attention: 20 }),
    ];
    buildSeries(points, "2026-01-01T00:00:00Z");
    // ordem original preservada
    expect(points[0].t).toBe("2026-01-01T00:00:10Z");
    expect(points[1].t).toBe("2026-01-01T00:00:00Z");
  });

  it("clampa t em 0 quando o ponto é anterior ao início da corrida", () => {
    const points = [pt({ t: "2026-01-01T00:00:00Z", attention: 5 })];
    const series = buildSeries(points, "2026-01-01T00:00:10Z");
    expect(series[0].t).toBe(0);
  });

  it("arredonda os segundos (1.5s -> 2)", () => {
    const points = [pt({ t: "2026-01-01T00:00:01.500Z", attention: 5 })];
    const series = buildSeries(points, "2026-01-01T00:00:00Z");
    expect(series[0].t).toBe(2);
  });

  it("preserva attention/meditation null nos pontos da série", () => {
    const points = [pt({ t: "2026-01-01T00:00:00Z", attention: null, meditation: null })];
    const series = buildSeries(points, "2026-01-01T00:00:00Z");
    expect(series[0].attention).toBeNull();
    expect(series[0].meditation).toBeNull();
  });
});

describe("buildRaceSummaries", () => {
  const racePlayers = [
    {
      id: "rp-1",
      race_id: "race-1",
      player_slot: 1,
      started_at: "2026-01-01T00:00:00Z",
      finished_at: "2026-01-01T00:00:10Z",
    },
    {
      id: "rp-2",
      race_id: "race-1",
      player_slot: 2,
      started_at: "2026-01-01T00:00:00Z",
      finished_at: null,
    },
  ];

  it("agrupa a telemetria por race_player_id e monta um resumo por corrida", () => {
    const telemetry: TelemetryRow[] = [
      // fora de ordem de propósito, e com linhas de rp-1 apenas
      pt({ race_player_id: "rp-1", t: "2026-01-01T00:00:05Z", attention: 80, meditation: 40 }),
      pt({ race_player_id: "rp-1", t: "2026-01-01T00:00:00Z", attention: 60, meditation: 20 }),
    ];
    const summaries = buildRaceSummaries(racePlayers, telemetry);
    expect(summaries).toHaveLength(2);

    const s1 = summaries[0];
    expect(s1.racePlayerId).toBe("rp-1");
    expect(s1.raceId).toBe("race-1");
    expect(s1.slot).toBe(1);
    expect(s1.startedAt).toBe("2026-01-01T00:00:00Z");
    expect(s1.finishedAt).toBe("2026-01-01T00:00:10Z");
    // att = [80, 60] -> avg 70, peak 80, ambos >= 60 -> 100% ; med = [40,20] -> avg 30
    expect(s1.metrics.avgAttention).toBe(70);
    expect(s1.metrics.peakAttention).toBe(80);
    expect(s1.metrics.focusZonePct).toBe(100);
    expect(s1.metrics.avgMeditation).toBe(30);
    expect(s1.metrics.durationSeconds).toBe(10);
    expect(s1.metrics.sampleCount).toBe(2);
    // série ordenada por t
    expect(s1.series).toEqual([
      { t: 0, attention: 60, meditation: 20 },
      { t: 5, attention: 80, meditation: 40 },
    ]);
  });

  it("corrida sem telemetria: métricas null-ish, sampleCount 0 e série vazia", () => {
    const telemetry: TelemetryRow[] = [
      pt({ race_player_id: "rp-1", t: "2026-01-01T00:00:00Z", attention: 60, meditation: 20 }),
    ];
    const summaries = buildRaceSummaries(racePlayers, telemetry);
    const s2 = summaries[1]; // rp-2 não tem telemetria

    expect(s2.racePlayerId).toBe("rp-2");
    expect(s2.slot).toBe(2);
    expect(s2.finishedAt).toBeNull();
    expect(s2.metrics.avgAttention).toBeNull();
    expect(s2.metrics.peakAttention).toBeNull();
    expect(s2.metrics.focusZonePct).toBeNull();
    expect(s2.metrics.avgMeditation).toBeNull();
    expect(s2.metrics.durationSeconds).toBeNull(); // finished_at null
    expect(s2.metrics.sampleCount).toBe(0);
    expect(s2.series).toEqual([]);
  });

  it("sem race players -> []", () => {
    expect(buildRaceSummaries([], [])).toEqual([]);
  });
});

describe("formatDuration", () => {
  it("null -> travessão", () => {
    expect(formatDuration(null)).toBe("—");
  });
  it("0s", () => {
    expect(formatDuration(0)).toBe("0s");
  });
  it("< 60 sem minutos", () => {
    expect(formatDuration(59)).toBe("59s");
  });
  it("60 -> 1m00s (segundos com padStart 2)", () => {
    expect(formatDuration(60)).toBe("1m00s");
  });
  it("61 -> 1m01s", () => {
    expect(formatDuration(61)).toBe("1m01s");
  });
  it("125 -> 2m05s", () => {
    expect(formatDuration(125)).toBe("2m05s");
  });
});

describe("formatPct", () => {
  it("null -> travessão", () => {
    expect(formatPct(null)).toBe("—");
  });
  it("0 -> 0%", () => {
    expect(formatPct(0)).toBe("0%");
  });
  it("100 -> 100%", () => {
    expect(formatPct(100)).toBe("100%");
  });
  it("arredonda para inteiro (toFixed(0))", () => {
    expect(formatPct(66.666)).toBe("67%");
    expect(formatPct(33.333)).toBe("33%");
  });
});

describe("formatRaceDate", () => {
  // toLocaleString sem timeZone -> os VALORES dependem do fuso do runner, mas o
  // SHAPE pt-BR (dd/mm <sep> hh:mm, sempre 2 dígitos) é invariante ao fuso.
  // Validamos o shape (determinístico), nunca o conteúdo localizado exato.
  it("retorna string no formato dd/mm <sep> hh:mm (shape TZ-safe)", () => {
    const out = formatRaceDate("2026-01-01T00:00:00Z");
    expect(typeof out).toBe("string");
    // \D+ tolera o separador (vírgula/espaço varia por versão de ICU) sem
    // depender do fuso; pega regressão de formato (opção removida, locale trocado).
    expect(out).toMatch(/^\d{2}\/\d{2}\D+\d{2}:\d{2}$/);
  });
});
