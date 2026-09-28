/**
 * Telão do estande (NEU-120). Lógica pura do modo Pódio: montar o pódio,
 * formatar o cronômetro e decidir quando celebrar um NOVO LÍDER.
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

/**
 * Tempo de corrida com uma casa decimal: no pódio, "1m05s" empataria corridas
 * que o ranking separa. "12,9 s" abaixo de 1 min; "1:05,3" a partir dele.
 */
export function formatRaceTime(seconds: number): string {
  const tenths = Math.round(seconds * 10);
  const m = Math.floor(tenths / 600);
  const rest = tenths - m * 600;
  const s = `${Math.floor(rest / 10)},${rest % 10}`;
  if (m === 0) return `${s} s`;
  return `${m}:${s.padStart(4, "0")}`;
}

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
