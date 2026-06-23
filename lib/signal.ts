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

export interface NoiseSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

export interface NoiseSegmentsOptions {
  /** quantidade de fragmentos (default 22) */
  count?: number;
  /** semente do PRNG (default 13) — determinístico (SSR === CSR) */
  seed?: number;
  /** largura do viewBox de referência (default 200) */
  width?: number;
  /** altura do viewBox de referência (default 300) */
  height?: number;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Fragmentos de linha curtos e dispersos para o campo de RUÍDO (decorativo).
 * Determinístico via mulberry32 — sem Math.random() em render (mismatch de hidratação).
 */
export function makeNoiseSegments(options: NoiseSegmentsOptions = {}): NoiseSegment[] {
  const count = options.count ?? 22;
  const width = options.width ?? 200;
  const height = options.height ?? 300;
  const rnd = mulberry32(options.seed ?? 13);
  const out: NoiseSegment[] = [];
  for (let i = 0; i < count; i++) {
    const x1 = rnd() * width;
    const y1 = rnd() * height;
    const len = 18 + rnd() * 46; // fragmentos curtos
    const angle = (rnd() - 0.5) * 1.4; // leve inclinação
    const opacity = Math.round((0.12 + rnd() * 0.33) * 100) / 100;
    out.push({
      x1: round1(x1),
      y1: round1(y1),
      x2: round1(x1 + Math.cos(angle) * len),
      y2: round1(y1 + Math.sin(angle) * len),
      opacity,
    });
  }
  return out;
}
