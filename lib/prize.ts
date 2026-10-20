/**
 * Prêmio da rodada no painel do vencedor (NEU-171). Lógica pura: validar o que vem do
 * banco, escolher o que o cartão mostra. O acesso ao Supabase fica em `prize-data.ts`.
 *
 * Contrato proposto à NEU-167 (comentado na NEU-171 em 20/10):
 *   get_my_prize() -> setof (round_name, status, code, claim_deadline, delivered_at),
 *   uma linha por (rodada, conta), só da conta logada (auth.uid(), sem parâmetro),
 *   do evento atual, mais recente primeiro.
 */
import { formatEventTime } from "./ranking";

/** Intervalo de atualização enquanto o código vale. */
export const PRIZE_REFRESH_MS = 30_000;

/** Sem código valendo: a rodada pode fechar com a pessoa já no painel (carência de 5 min na NEU-167). */
export const PRIZE_IDLE_REFRESH_MS = 60_000;

/** Linha devolvida por `get_my_prize`. `status` é texto: estado novo no banco não pode quebrar a tela. */
export type PrizeRow = {
  round_name: string;
  status: string;
  code: string | null;
  claim_deadline: string | null;
  delivered_at: string | null;
};

export type PrizeView =
  | { kind: "none" }
  | { kind: "open"; round: string; code: string; deadline: string | null; late: boolean }
  | { kind: "delivered"; round: string; at: string | null }
  | { kind: "passed"; round: string };

/**
 * Estados em que o código vale (NEU-167). `avisando` e `aviso_falhou` ainda não têm
 * janela: sem canal confirmado, o painel é o único lugar onde a pessoa vê o código.
 */
const CODE_VALID = new Set(["avisando", "aviso_falhou", "avisado", "prazo_estourou"]);

/**
 * O atraso vem só do banco (`prazo_estourou`): o relógio do aparelho pode estar
 * adiantado ou atrasado e contradizer o estande.
 */
export function prizeView(prize: PrizeRow): PrizeView {
  const round = prize.round_name;

  if (CODE_VALID.has(prize.status)) {
    if (!prize.code) return { kind: "none" };
    const deadline = prize.claim_deadline ? formatEventTime(prize.claim_deadline) : null;
    return { kind: "open", round, code: prize.code, deadline, late: prize.status === "prazo_estourou" };
  }
  if (prize.status === "entregue") {
    return {
      kind: "delivered",
      round,
      at: prize.delivered_at ? formatEventTime(prize.delivered_at) : null,
    };
  }
  // `passou`: o prêmio foi para outra conta (proposto à NEU-167); `recusado`: a pessoa abriu mão.
  if (prize.status === "passou" || prize.status === "recusado") return { kind: "passed", round };
  return { kind: "none" };
}

/**
 * Todos os códigos valendo, para nenhum prêmio passar sem a pessoa saber. Sem nenhum,
 * o mais recente que tem algo a dizer: uma linha vazia não esconde a retirada anterior.
 */
export function visiblePrizes(rows: readonly PrizeRow[]): PrizeRow[] {
  const open = rows.filter((r) => prizeView(r).kind === "open");
  if (open.length > 0) return open;
  const last = rows.find((r) => prizeView(r).kind !== "none");
  return last ? [last] : [];
}

/** Prêmio retirado: cada conta ganha uma vez no evento, então não há mais o que buscar. */
export function hasClaimedPrize(rows: readonly PrizeRow[]): boolean {
  return rows.some((r) => r.status === "entregue");
}

const isText = (v: unknown): v is string => typeof v === "string";
const isTextOrNull = (v: unknown): boolean => v === null || isText(v);

function isPrizeRow(v: unknown): v is PrizeRow {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    isText(r.round_name) &&
    isText(r.status) &&
    isTextOrNull(r.code) &&
    isTextOrNull(r.claim_deadline) &&
    isTextOrNull(r.delivered_at)
  );
}

/**
 * Confere o formato no tempo de execução: os tipos foram escritos à mão para um contrato
 * que a NEU-167 ainda vai publicar. Fora da lista combinada -> null; linha fora do
 * formato é descartada.
 */
export function parsePrizeRows(data: unknown): PrizeRow[] | null {
  if (!Array.isArray(data)) return null;
  return data.filter(isPrizeRow);
}
