/**
 * Ranking por rodada (NEU-111). Lógica pura: escolher a rodada atual/anterior
 * e formatar o tempo restante. O acesso ao Supabase fica em `ranking-data.ts`.
 *
 * Contrato assumido com a NEU-110 (proposto no Linear em 28/09):
 *   ranking_windows(id, name, starts_at, ends_at), leitura pública;
 *   get_leaderboard(p_metric, p_limit, p_from, p_to), com p_from/p_to opcionais.
 */

/** Intervalo de atualização do ranking (página e telão). */
export const RANKING_REFRESH_MS = 15_000;

/** Linhas do telão: letra grande, cabe numa TV sem rolar. */
export const TELAO_LIMIT = 10;

export type RankingWindow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
};

export type ResolvedWindows = {
  /** Início do evento = a rodada que começa mais cedo. */
  eventStart: string;
  /** Rodada com starts_at <= agora < ends_at. */
  current: RankingWindow | null;
  /** Última rodada já encerrada (maior ends_at <= agora). */
  previous: RankingWindow | null;
};

/** Sem rodadas cadastradas devolve null: a UI mostra só o ranking geral. */
export function resolveWindows(
  windows: readonly RankingWindow[],
  now: Date,
): ResolvedWindows | null {
  const valid = windows.filter(
    (w) => Date.parse(w.starts_at) < Date.parse(w.ends_at),
  );
  if (valid.length === 0) return null;

  const t = now.getTime();
  const byStart = [...valid].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );

  // Sobreposição não deveria existir; se existir, vale a que começou por último.
  const current =
    byStart
      .filter((w) => Date.parse(w.starts_at) <= t && t < Date.parse(w.ends_at))
      .at(-1) ?? null;

  const previous =
    valid
      .filter((w) => Date.parse(w.ends_at) <= t)
      .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))[0] ?? null;

  return { eventStart: byStart[0].starts_at, current, previous };
}

/** "1h 05min", "12min", "menos de 1 min", "encerrada". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "encerrada";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "menos de 1 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "14:00–16:00", sempre no fuso do evento (servidor e browser iguais). */
export function formatWindowRange(w: RankingWindow): string {
  return `${timeFmt.format(new Date(w.starts_at))}–${timeFmt.format(new Date(w.ends_at))}`;
}
