"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/components/ranking/LeaderboardTable";
import { useLiveRanking, useNow } from "@/components/ranking/useLiveRanking";
import type { RankingSnapshot } from "@/lib/ranking-data";
import {
  NEW_LEADER_MS,
  PODIO_LIMIT,
  buildPodium,
  formatClock,
  formatRaceTime,
  initials,
  isNewLeader,
  type Leadership,
  type PodiumSlot,
} from "@/lib/telao";
import { TelaoStage } from "./TelaoStage";
import { TelaoOperator } from "./TelaoOperator";

/** Cores e alturas do pódio (canvas da NEU-120, opção B). */
const PLACE = {
  // pad: respiro acima do "Nº" (64px); o bloco do 3º (80px) só comporta 8px.
  1: { label: "1º", color: "var(--color-gold)", bg: "#2a2610", block: 180, pad: 18, avatar: 150, name: 56 },
  2: { label: "2º", color: "var(--color-silver)", bg: "#1a2430", block: 120, pad: 18, avatar: 120, name: 40 },
  3: { label: "3º", color: "var(--color-bronze)", bg: "#241b12", block: 80, pad: 8, avatar: 120, name: 40 },
} as const;

function leadershipOf(snap: RankingSnapshot): Leadership {
  const current = snap.windows?.current;
  if (!current) return null;
  return { windowId: current.id, name: snap.round?.rows[0]?.display_name ?? null };
}

/**
 * Telão modo Pódio (NEU-120): rodada atual com cronômetro, pódio do 1º ao 3º,
 * 4º ao 9º embaixo, convite com QR e a celebração de NOVO LÍDER.
 * Sem rodada acontecendo, mostra o pódio do geral do evento, sem cronômetro.
 */
export function TelaoPodio({
  initial,
  qrSvg,
  host,
}: {
  initial: RankingSnapshot;
  /** SVG do QR, gerado no servidor. */
  qrSvg: string;
  host: string;
}) {
  const leadership = useRef<Leadership>(leadershipOf(initial));
  const [celebrate, setCelebrate] = useState<LeaderboardRow | null>(null);

  const { snap, stale } = useLiveRanking(initial, {
    limit: PODIO_LIMIT,
    onUpdate: (next) => {
      const after = leadershipOf(next);
      if (isNewLeader(leadership.current, after)) {
        setCelebrate(next.round?.rows[0] ?? null);
      }
      leadership.current = after;
    },
  });
  const now = useNow(1_000);

  useEffect(() => {
    if (!celebrate) return;
    const hide = setTimeout(() => setCelebrate(null), NEW_LEADER_MS);
    return () => clearTimeout(hide);
  }, [celebrate]);

  const current = snap.windows?.current ?? null;
  const board = current ? snap.round : snap.event;
  const rows = board?.rows ?? [];
  const { podium, rest } = buildPodium(rows);

  return (
    <MotionConfig reducedMotion="user">
      <TelaoStage>
        <div className="flex h-full flex-col gap-6 px-20 py-12 font-sans text-fg-strong">
          <header className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-[56px] font-bold tracking-[-0.02em]">
                {current?.name ?? "Geral do evento"}
              </h1>
              <LiveBadge stale={stale} />
            </div>
            {current && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[26px] tracking-[0.08em] text-fg">TERMINA EM</span>
                <span
                  className="font-mono text-[96px] leading-none font-bold tabular-nums"
                  aria-label="Tempo restante da rodada"
                >
                  {now ? formatClock(Date.parse(current.ends_at) - now.getTime()) : "–:––:––"}
                </span>
              </div>
            )}
          </header>

          {rows.length === 0 ? (
            <EmptyState round={Boolean(current)} />
          ) : (
            <LayoutGroup>
              <ol
                aria-label="Pódio"
                className="flex min-h-[480px] items-end justify-center gap-10"
              >
                {podium.map((slot) => (
                  <PodiumColumn key={slot.place} slot={slot} />
                ))}
              </ol>

              <ol
                aria-label="Do 4º ao 9º"
                className={cn(
                  "grid grid-cols-2 gap-x-16 gap-y-3 pt-5",
                  rest.length > 0 && "border-t border-hairline",
                )}
              >
                {rest.map((r) => (
                  <motion.li
                    layout
                    key={r.display_name}
                    className="flex items-center gap-6 py-1.5 text-[32px]"
                  >
                    <span className="w-12 font-display font-bold text-fg-muted">{r.rank}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.display_name}</span>
                    <span className="font-mono text-fg tabular-nums">
                      {formatRaceTime(r.score)}
                    </span>
                  </motion.li>
                ))}
              </ol>
            </LayoutGroup>
          )}

          <footer className="mt-auto flex items-center gap-6">
            <div
              className="size-[84px] shrink-0 overflow-hidden rounded-[10px] [&>svg]:size-full"
              role="img"
              aria-label={`QR code para ${host}`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="font-display text-[32px] font-bold">
              Seu nome aqui? Jogue no estande{" "}
              <span className="font-mono text-[24px] font-medium text-attention">{host}</span>
            </p>
          </footer>
        </div>

        <AnimatePresence>
          {celebrate && <NewLeader key={celebrate.display_name} row={celebrate} />}
        </AnimatePresence>
      </TelaoStage>
      <TelaoOperator />
    </MotionConfig>
  );
}

function LiveBadge({ stale }: { stale: boolean }) {
  // Sem texto explicativo na TV: só "ao vivo" ou, se cair, um aviso discreto.
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[26px] font-bold",
        stale ? "text-fg-muted" : "text-attention",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-3.5 rounded-full",
          stale ? "bg-meditation" : "animate-pulse bg-attention",
        )}
      />
      {stale ? "reconectando…" : "AO VIVO · melhor tempo"}
    </p>
  );
}

function PodiumColumn({ slot }: { slot: PodiumSlot }) {
  const p = PLACE[slot.place];
  const row = slot.row;
  return (
    <li
      className="flex w-[420px] flex-col items-center gap-[18px]"
      aria-label={row ? `${p.label} lugar: ${row.display_name}, ${formatRaceTime(row.score)}` : `${p.label} lugar: vago`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={row?.display_name ?? "vago"}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-[18px]"
        >
          <div
            aria-hidden
            className={cn(
              "flex items-center justify-center rounded-full border-4 bg-surface font-display font-bold",
              !row && "border-dashed",
            )}
            style={{
              width: p.avatar,
              height: p.avatar,
              borderColor: row ? p.color : "var(--color-border)",
              color: p.color,
              fontSize: Math.round(p.avatar / 2.6),
            }}
          >
            {row ? initials(row.display_name) : ""}
          </div>
          <div
            className="max-w-[420px] truncate font-display font-bold"
            style={{ fontSize: p.name }}
          >
            {/* Vago: mantém a altura da linha para o pódio não pular quando alguém entra. */}
            {row?.display_name ?? " "}
          </div>
          <div
            className="font-mono text-[40px] font-bold tabular-nums"
            style={{ color: row ? p.color : "var(--color-fg-muted)" }}
          >
            {row ? formatRaceTime(row.score) : "vago"}
          </div>
        </motion.div>
      </AnimatePresence>
      <div
        aria-hidden
        className="flex w-full shrink-0 justify-center rounded-t-[18px] border-2 border-b-0 font-display text-[64px] leading-none font-bold"
        style={{ height: p.block, paddingTop: p.pad, background: p.bg, borderColor: p.color, color: p.color }}
      >
        {p.label}
      </div>
    </li>
  );
}

function EmptyState({ round }: { round: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-[72px] font-bold">
        {round ? "A rodada começou" : "O ranking abre com a 1ª corrida"}
      </p>
      <p className="text-[36px] text-fg">Seja o primeiro no pódio.</p>
    </div>
  );
}

function NewLeader({ row }: { row: LeaderboardRow }) {
  return (
    <motion.div
      role="status"
      aria-live="assertive"
      className="absolute inset-0 flex items-center justify-center bg-bg/90 text-fg-strong"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.6 }}
        animate={{ scale: [0.6, 1.04, 1] }}
        transition={{ duration: 0.9, times: [0, 0.6, 1], ease: "easeOut" }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </svg>
        <p className="font-display text-[40px] font-bold tracking-[0.14em] text-gold">
          NOVO LÍDER DA RODADA
        </p>
        <p className="max-w-[1700px] truncate pb-4 font-display text-[150px] leading-[1.1] font-bold">
          {row.display_name}
        </p>
        <p className="font-mono text-[60px] font-bold text-attention tabular-nums">
          {formatRaceTime(row.score)}
        </p>
      </motion.div>
    </motion.div>
  );
}
