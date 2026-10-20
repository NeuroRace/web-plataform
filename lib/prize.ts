/**
 * Prêmio da rodada no painel do vencedor (NEU-171). Lógica pura: escolher o
 * prêmio que importa e decidir o que o cartão mostra. O acesso ao Supabase
 * fica em `prize-data.ts`.
 *
 * Contrato proposto à NEU-167 (comentado na NEU-171 em 20/10):
 *   get_my_prize() -> setof (round_name, status, code, claim_deadline, delivered_at),
 *   só da conta logada (auth.uid(), sem parâmetro), do evento atual, mais recente primeiro.
 */

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

/** Hora de São Paulo, onde fica o estande, qualquer que seja o fuso do aparelho. */
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** `now` é null antes de montar no navegador: sem relógio, não marca atraso (evita divergência de hidratação). */
export function prizeView(prize: PrizeRow | null, now: Date | null): PrizeView {
  if (!prize) return { kind: "none" };
  const round = prize.round_name;

  if (CODE_VALID.has(prize.status)) {
    if (!prize.code) return { kind: "none" };
    const deadline = prize.claim_deadline;
    const late =
      prize.status === "prazo_estourou" ||
      (deadline != null && now != null && now.getTime() > Date.parse(deadline));
    return { kind: "open", round, code: prize.code, deadline: deadline ? clock(deadline) : null, late };
  }
  if (prize.status === "entregue") {
    return { kind: "delivered", round, at: prize.delivered_at ? clock(prize.delivered_at) : null };
  }
  // `passou`: o prêmio foi para outra conta (proposto à NEU-167); `recusado`: a pessoa abriu mão.
  if (prize.status === "passou" || prize.status === "recusado") return { kind: "passed", round };
  return { kind: "none" };
}

/** O prêmio com código valendo vem antes de qualquer outro; sem ele, o mais recente. */
export function pickPrize(rows: readonly PrizeRow[]): PrizeRow | null {
  return rows.find((r) => CODE_VALID.has(r.status) && r.code) ?? rows[0] ?? null;
}
