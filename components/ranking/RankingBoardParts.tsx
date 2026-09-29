"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import type { Board } from "@/lib/ranking-data";
import { cn } from "@/lib/utils";
import { buttonClass, ButtonLink } from "@/components/ui/Button";
import { LeaderboardTable } from "./LeaderboardTable";
import mascotWinner from "@/public/assets/images/mascot-winner.png";

export type RankingTab = "evento" | "rodada";

const clockFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Peças visuais do RankingBoard (NEU-111). `big` = variante do telão. */

export function Tabs({
  value,
  onChange,
  big,
}: {
  value: RankingTab;
  onChange: (t: RankingTab) => void;
  big: boolean;
}) {
  const tabs: { id: RankingTab; label: string }[] = [
    { id: "rodada", label: "Rodada atual" },
    { id: "evento", label: "Evento" },
  ];
  const listId = useId();

  return (
    <div
      role="tablist"
      aria-label="Período do ranking"
      id={listId}
      className="inline-flex rounded-full border border-border bg-surface/50 p-1"
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const next = value === "rodada" ? "evento" : "rodada";
        onChange(next);
        document.getElementById(`ranking-tab-${next}`)?.focus();
      }}
    >
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            id={`ranking-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`ranking-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-full font-display font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-attention",
              big ? "px-7 py-3 text-2xl" : "px-4 py-2 text-sm",
              selected ? "bg-attention text-bg" : "text-fg hover:text-fg-strong",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function RoundHeader({
  name,
  range,
  remaining,
  big,
}: {
  name: string | null;
  range: string | null;
  remaining: string | null;
  big: boolean;
}) {
  if (!name) {
    return (
      <div className={cn("mt-12 glass-card mx-auto max-w-2xl p-8 text-center sm:p-10", big && "mt-16")}>
        <p className={cn("text-fg text-lg", big && "text-3xl")}>
          Nenhuma rodada acontecendo agora. <br className="hidden sm:block" />
          Veja o ranking do evento.
        </p>
      </div>
    );
  }
  return (
    <div className={cn("mt-6 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1", big && "mt-8")}>
      <h2 className={cn("font-display font-bold text-fg-strong", big ? "text-4xl" : "text-xl")}>
        {name}
      </h2>
      <span className={cn("font-mono text-fg-muted tabular-nums", big ? "text-2xl" : "text-sm")}>
        {range}
      </span>
      {remaining && (
        <span
          className={cn(
            "rounded-full bg-attention/15 font-semibold text-attention tabular-nums",
            big ? "px-4 py-1.5 text-2xl" : "px-2.5 py-0.5 text-xs",
          )}
        >
          {remaining === "encerrada" ? "encerrada" : `faltam ${remaining}`}
        </span>
      )}
    </div>
  );
}

export function PreviousWinner({
  name,
  time,
  round,
  big,
}: {
  name: string;
  time: string;
  round: string;
  big: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-6 flex items-center justify-center gap-4 rounded-card border border-gold/30 bg-gold/5 mx-auto max-w-2xl",
        big ? "p-6" : "p-4",
      )}
    >
      <span aria-hidden className={big ? "text-5xl" : "text-2xl"}>
        🏆
      </span>
      <p className={cn("text-fg text-center", big ? "text-2xl" : "text-sm")}>
        Vencedor da {round}:{" "}
        <strong className="font-display text-gold">{name}</strong>{" "}
        <span className="font-mono text-fg-strong tabular-nums">({time})</span>
      </p>
    </div>
  );
}

export function BoardContent({
  board,
  tab,
  hasCurrentRound,
  highlight,
  big,
}: {
  board: Board | null;
  tab: RankingTab;
  hasCurrentRound: boolean;
  highlight: string | null;
  big: boolean;
}) {
  // O RoundHeader já exibe um card centralizado caso não haja rodada.
  if (tab === "rodada" && !hasCurrentRound) return null;

  if (!board || board.error) {
    return (
      <p
        role="alert"
        className="glass-card mx-auto max-w-2xl mt-8 p-6 text-center text-fg"
      >
        Não consegui carregar o ranking agora. Tentando de novo em instantes.
      </p>
    );
  }

  if (board.rows.length === 0) {
    const rodada = tab === "rodada";
    return (
      <div className="glass-card mx-auto max-w-2xl mt-8 p-8 text-center sm:p-10">
        <Image
          src={mascotWinner}
          alt=""
          className={cn("mx-auto h-auto opacity-90", big ? "w-48" : "w-32")}
        />
        <h2
          className={cn(
            "mt-6 font-display font-bold text-fg-strong",
            big ? "text-4xl" : "text-2xl",
          )}
        >
          {rodada ? "A rodada começou!" : "Ranking vazio"}
        </h2>
        <p className={cn("mx-auto mt-2 max-w-md text-fg-muted", big && "max-w-2xl text-2xl")}>
          {rodada
            ? "Seja o primeiro a assumir a liderança."
            : "Jogue no estande e apareça aqui."}
        </p>
      </div>
    );
  }

  return (
    <LeaderboardTable
      rows={board.rows}
      highlight={highlight}
      size={big ? "telao" : "default"}
      caption={
        tab === "rodada"
          ? "Ranking da rodada atual por melhor tempo"
          : "Ranking do evento por melhor tempo"
      }
    />
  );
}

export function LiveStatus({
  fetchedAt,
  stale,
  big,
}: {
  fetchedAt: string;
  stale: boolean;
  big: boolean;
}) {
  return (
    <p
      className={cn(
        "mt-4 flex items-center justify-end gap-2 text-fg-muted",
        big ? "text-base" : "text-xs",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-2 rounded-full",
          stale ? "bg-meditation" : "animate-pulse bg-attention",
        )}
      />
      {stale
        ? "Sem conexão com o ranking. Mostrando a última atualização"
        : "Atualiza sozinho a cada 15 s"}
      <span className="font-mono tabular-nums">· {clockFmt.format(new Date(fetchedAt))}</span>
    </p>
  );
}

export function TelaoControls() {
  const [full, setFull] = useState(false);

  useEffect(() => {
    const sync = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return (
    <div className="flex gap-3">
      <button
        type="button"
        className={buttonClass("secondary", "px-4 py-2 text-sm")}
        onClick={() =>
          full
            ? void document.exitFullscreen()
            : void document.documentElement.requestFullscreen?.()
        }
      >
        {full ? "Sair da tela cheia" : "Tela cheia"}
      </button>
      <ButtonLink href="/ranking" variant="ghost" className="px-4 py-2 text-sm">
        Sair do telão
      </ButtonLink>
    </div>
  );
}
