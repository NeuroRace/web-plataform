import { formatDuration } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** Linha crua devolvida por `get_leaderboard` (rank, display_name, score). */
export type LeaderboardRow = {
  rank: number;
  display_name: string;
  score: number;
};

/**
 * Peso visual por posição. A cor carrega informação (regra do design system):
 * quanto mais forte o acento de atenção, melhor a colocação.
 */
function rankTone(rank: number): string {
  if (rank === 1) return "text-attention glow-attention";
  if (rank === 2) return "text-attention/80";
  if (rank === 3) return "text-attention/60";
  return "text-fg-muted";
}

export function LeaderboardTable({
  rows,
  highlight,
}: {
  rows: LeaderboardRow[];
  /** Apelido do usuário logado, para marcar a linha dele. */
  highlight?: string | null;
}) {
  // display_name é citext no banco: a comparação aqui também ignora caixa.
  const mine = highlight?.trim().toLowerCase() ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Ranking por melhor tempo de corrida
        </caption>
        <thead>
          <tr className="border-b border-hairline text-xs uppercase tracking-wider text-fg-muted">
            <th scope="col" className="w-16 px-3 py-3 font-medium">
              #
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Jogador
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Melhor tempo
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMine =
              mine !== null && row.display_name.toLowerCase() === mine;

            return (
              <tr
                key={`${row.rank}-${row.display_name}`}
                aria-current={isMine ? "true" : undefined}
                className={cn(
                  "border-b border-hairline/60 transition-colors",
                  isMine
                    ? "bg-attention/10 ring-1 ring-inset ring-attention/40"
                    : "hover:bg-surface/40",
                )}
              >
                <td
                  className={cn(
                    "px-3 py-4 font-display text-xl font-bold tabular-nums",
                    rankTone(row.rank),
                  )}
                >
                  {row.rank}
                </td>
                <td className="px-3 py-4">
                  <span
                    className={cn(
                      "font-medium",
                      isMine ? "text-attention" : "text-fg-strong",
                    )}
                  >
                    {row.display_name}
                  </span>
                  {isMine && (
                    <span className="ml-2 rounded-full bg-attention/15 px-2 py-0.5 align-middle text-xs font-semibold text-attention">
                      você
                    </span>
                  )}
                </td>
                <td className="px-3 py-4 text-right font-mono text-fg-strong tabular-nums">
                  {formatDuration(row.score)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
