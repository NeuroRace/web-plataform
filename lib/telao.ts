/**
 * Telão do estande (NEU-120). Lógica pura dos modos Pódio e Carrossel: montar o
 * pódio, formatar o cronômetro, decidir quando celebrar um NOVO LÍDER e qual tela vem depois.
 */
import type { LeaderboardRow } from "@/components/ranking/LeaderboardTable";

/** Palco fixo do telão: o layout é desenhado em 1920×1080 e escalado para a TV. */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Pódio (3) + lista do 4º ao 9º em duas colunas: cabe na TV sem rolar. */
export const PODIO_LIMIT = 9;

/** Duração da celebração de NOVO LÍDER. */
export const NEW_LEADER_MS = 3_600;

/** Cronômetro regressivo "H:MM:SS". Zero ou negativo fica em "0:00:00". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Tempo de corrida no telão: é o próprio formatDuration, para nunca divergir do resto do site. */
export { formatDuration as formatRaceTime } from "@/lib/metrics";

/** Duas letras para o avatar: "luna_zen" → "LU", "Léo" → "LÉ", "42" → "#". */
export function initials(name: string): string {
  const letters = name.replace(/[^\p{L}]/gu, "").slice(0, 2).toUpperCase();
  return letters || "#";
}

export type PodiumSlot = { place: 1 | 2 | 3; row: LeaderboardRow | null };

/**
 * Pódio na ordem visual (2º, 1º, 3º) e o resto (4º em diante).
 * Com menos de 3 corridas, as posições vazias vêm com row = null.
 */
export function buildPodium(rows: readonly LeaderboardRow[]): {
  podium: [PodiumSlot, PodiumSlot, PodiumSlot];
  rest: LeaderboardRow[];
} {
  const at = (i: number) => rows[i] ?? null;
  return {
    podium: [
      { place: 2, row: at(1) },
      { place: 1, row: at(0) },
      { place: 3, row: at(2) },
    ],
    rest: rows.slice(3, PODIO_LIMIT),
  };
}

/** Quem lidera, e em qual rodada. null = sem rodada acontecendo; name null = rodada sem corridas. */
export type Leadership = { windowId: string; name: string | null } | null;

/**
 * Celebra quando, na MESMA rodada, o 1º passa a ser outra pessoa, inclusive a
 * 1ª corrida de uma rodada vazia. Não celebra na primeira leitura (abrir o telão
 * não é novidade) nem na troca de rodada (o placar zera, ninguém ultrapassou).
 */
export function isNewLeader(before: Leadership, after: Leadership): boolean {
  if (!before || !after?.name) return false;
  if (before.windowId !== after.windowId) return false;
  return before.name !== after.name;
}

/**
 * Carrossel (NEU-123): o telão alterna sozinho entre o Pódio da rodada, o geral
 * do evento e "Como jogar". "Venceu a Rodada N" espera o vencedor oficial (NEU-167).
 */
export type Slide = "rodada" | "evento" | "comoJogar";

/** Quanto cada tela fica no ar. A rodada é o que importa: fica mais. */
export const SLIDE_MS: Record<Slide, number> = {
  rodada: 20_000,
  evento: 12_000,
  comoJogar: 12_000,
};

/** Telas do carrossel na ordem. Sem rodada acontecendo, não há Pódio da rodada. */
export function carouselSlides(hasRound: boolean): Slide[] {
  return hasRound ? ["rodada", "evento", "comoJogar"] : ["evento", "comoJogar"];
}

/** Próxima tela. Se a atual saiu da lista (a rodada acabou), volta para a primeira. */
export function nextSlide(slides: readonly Slide[], current: Slide): Slide {
  const i = slides.indexOf(current);
  return i === -1 ? slides[0] : slides[(i + 1) % slides.length];
}
