/** Funções puras de série do NeuroCoach 2.0 (NEU-115). Sem dependências. */

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Média móvel à esquerda: MA[i] = média de values[max(0, i-window+1)..i]. */
export function movingAverage(values: number[], window = 5): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    out.push(sum / Math.min(i + 1, window));
  }
  return out;
}

/** Divide por índice em 3 partes de floor(n/3); o resto vai para o último terço. */
export function thirds(values: number[]): [number[], number[], number[]] {
  const size = Math.floor(values.length / 3);
  return [values.slice(0, size), values.slice(size, 2 * size), values.slice(2 * size)];
}

/** Desvio-padrão populacional. */
export function stdDev(values: number[]): number | null {
  const m = mean(values);
  if (m === null) return null;
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length);
}

/** Maior sequência consecutiva com valor >= threshold (a primeira, em empate). */
export function longestRunAtOrAbove(
  values: number[],
  threshold: number,
): { start: number; end: number; length: number } | null {
  let best: { start: number; end: number; length: number } | null = null;
  let runStart = -1;
  for (let i = 0; i <= values.length; i++) {
    const inRun = i < values.length && values[i] >= threshold;
    if (inRun && runStart === -1) runStart = i;
    if (!inRun && runStart !== -1) {
      const length = i - runStart;
      if (!best || length > best.length) best = { start: runStart, end: i - 1, length };
      runStart = -1;
    }
  }
  return best;
}

/** delta[i] = values[i] - values[i - lag], para i >= lag (índice original preservado). */
export function windowDeltas(values: number[], lag = 5): Array<{ index: number; delta: number }> {
  const out: Array<{ index: number; delta: number }> = [];
  for (let i = lag; i < values.length; i++) out.push({ index: i, delta: values[i] - values[i - lag] });
  return out;
}
