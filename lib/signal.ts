import type { SeriesPoint } from "@/lib/metrics";

export interface DemoSeriesOptions {
  /** quantidade de amostras (default 60) */
  points?: number;
  /** semente do PRNG (default 7) — torna o resultado determinístico (SSR === CSR) */
  seed?: number;
}

/** PRNG determinístico (mulberry32). Evita Math.random() em render (mismatch de hidratação). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Série de telemetria SINTÉTICA para a onda de DEMONSTRAÇÃO da landing.
 * NÃO é leitura real — quem renderiza deve rotular como demonstração.
 */
export function makeDemoSeries(options: DemoSeriesOptions = {}): SeriesPoint[] {
  const points = options.points ?? 60;
  const rnd = mulberry32(options.seed ?? 7);
  const out: SeriesPoint[] = [];
  let attention = 55;
  let meditation = 45;
  for (let t = 0; t < points; t++) {
    // passeio suave + oscilação senoidal → curva orgânica de EEG
    attention = clamp(attention + (rnd() - 0.5) * 22 + Math.sin(t / 4) * 6, 12, 96);
    meditation = clamp(meditation + (rnd() - 0.5) * 16 + Math.cos(t / 6) * 4, 10, 80);
    out.push({ t, attention: Math.round(attention), meditation: Math.round(meditation) });
  }
  return out;
}

/** Uma amostra de atenção está "em foco" se >= limiar. null => false. */
export function isInFocusZone(attention: number | null, threshold: number): boolean {
  return attention != null && attention >= threshold;
}
