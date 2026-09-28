"use client";

import { motion } from "motion/react";
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
  size = "default",
  caption = "Ranking por melhor tempo de corrida",
}: {
  rows: LeaderboardRow[];
  /** Apelido do usuário logado, para marcar a linha dele. */
  highlight?: string | null;
  /** `telao`: letra grande para TV no estande (NEU-111). */
  size?: "default" | "telao";
  caption?: string;
}) {
  const big = size === "telao";
  // display_name é citext no banco: a comparação aqui também ignora caixa.
  const mine = highlight?.trim().toLowerCase() ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr
            className={cn(
              "border-b border-hairline uppercase tracking-wider text-fg-muted",
              big ? "text-base" : "text-xs",
            )}
          >
            <th scope="col" className={cn("px-3 py-3 font-medium", big ? "w-24" : "w-16")}>
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
              // layout: ao atualizar ao vivo, quem sobe de posição desliza em vez de pular.
              <motion.tr
                layout="position"
                transition={{ duration: 0.35, ease: "easeOut" }}
                key={row.display_name}
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
                    "px-3 font-display font-bold tabular-nums",
                    big ? "py-5 text-4xl" : "py-4 text-xl",
                    rankTone(row.rank),
                  )}
                >
                  {row.rank}
                </td>
                <td className={cn("px-3", big ? "py-5" : "py-4")}>
                  <span
                    className={cn(
                      "font-medium",
                      big && "text-3xl",
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
                <td
                  className={cn(
                    "px-3 text-right font-mono text-fg-strong tabular-nums",
                    big ? "py-5 text-3xl" : "py-4",
                  )}
                >
                  {formatDuration(row.score)}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
