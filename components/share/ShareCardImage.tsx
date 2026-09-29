/* eslint-disable @next/next/no-img-element -- renderizado pelo Satori (next/og), que só entende <img> */
import type { ReactNode } from "react";
import type { ArchetypeCardData, ShareCardData } from "@/lib/share-card";
import type { Badge } from "@/lib/coach/types";
import { formatDuration } from "@/lib/metrics";
import { formatRaceTime } from "@/lib/telao";

/**
 * Cards dos Stories (1080×1920) renderizados pelo `next/og` (Satori), NEU-88.
 * Satori não lê CSS nem Tailwind: só estilo inline, e todo nó com mais de um filho
 * precisa de `display: flex`. As cores repetem os tokens de `globals.css`.
 */
const C = {
  bg: "#0f1e2e",
  bgDeep: "#0a141f",
  surface: "#1a2a3d",
  border: "#2a3c50",
  fg: "#f1f5f9",
  muted: "#b9c6d4",
  attention: "#5be3c8",
  gold: "#ffd700",
  silver: "#c9d6e2",
  bronze: "#e0a36a",
};

const PLACE_COLOR: Record<number, string> = { 1: C.gold, 2: C.silver, 3: C.bronze };

type Assets = { mascotSrc: string; logoSrc: string; qrSrc: string; host: string };

/** Card "Melhor tempo". */
export function ShareCardImage({ card, ...assets }: { card: ShareCardData } & Assets) {
  const placeColor = card.rank ? (PLACE_COLOR[card.rank] ?? C.attention) : C.attention;

  return (
    <Frame assets={assets}>
      <img src={assets.mascotSrc} width={560} height={502} alt="" style={{ marginTop: 70 }} />

      <Eyebrow style={{ marginTop: 40 }}>MEU MELHOR TEMPO</Eyebrow>
      <span style={{ marginTop: 8, fontSize: 190, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
        {card.bestTime != null ? formatRaceTime(card.bestTime) : "–"}
      </span>
      <Name style={{ marginTop: 28, fontSize: 72 }}>{card.name}</Name>

      {card.rank != null && (
        <span
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 40,
            fontWeight: 700,
            color: C.bgDeep,
            backgroundColor: placeColor,
            borderRadius: 999,
            padding: "14px 40px",
          }}
        >
          {`${card.rank}º no ranking do evento`}
        </span>
      )}

      <div style={{ display: "flex", gap: 28, marginTop: 56 }}>
        <Stat label="FOCO MÉDIO" value={card.avgFocus != null ? `${card.avgFocus}%` : "–"} width={380} />
        <Stat label={card.races === 1 ? "CORRIDA" : "CORRIDAS"} value={String(card.races)} width={380} />
      </div>
    </Frame>
  );
}

/** Card "Meu arquétipo": arquétipo e badges do NeuroCoach da corrida mais recente. */
export function ArchetypeCardImage({ card, ...assets }: { card: ArchetypeCardData } & Assets) {
  const { race } = card;
  return (
    <Frame assets={assets}>
      <img src={assets.mascotSrc} width={400} height={360} alt="" style={{ marginTop: 44, objectFit: "contain" }} />

      <Eyebrow style={{ marginTop: 26 }}>MEU ARQUÉTIPO NEURO</Eyebrow>
      <span style={{ marginTop: 6, fontSize: 118, fontWeight: 700, letterSpacing: -2, color: C.attention, lineHeight: 1.1 }}>
        {card.archetype.label}
      </span>
      <span style={{ marginTop: 14, maxWidth: 860, fontSize: 36, lineHeight: 1.35, color: C.muted, textAlign: "center" }}>
        {card.archetype.description}
      </span>

      {card.badges.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44, width: "100%" }}>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 6, color: C.gold }}>CONQUISTAS</span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 18,
              marginTop: 20,
              width: 920,
            }}
          >
            {card.badges.map((b) => (
              <BadgeChip key={b.id} id={b.id} label={b.label} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
        <Stat label="FOCO MÉDIO" value={race.avgFocus != null ? `${race.avgFocus}%` : "–"} width={290} />
        <Stat label="PICO" value={race.peakFocus != null ? `${race.peakFocus}%` : "–"} width={290} />
        <Stat label="DURAÇÃO" value={formatDuration(race.durationSeconds)} width={290} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 36 }}>
        <Name style={{ fontSize: 56, maxWidth: 560 }}>{card.name}</Name>
        {card.rank != null && (
          <span style={{ fontSize: 36, color: PLACE_COLOR[card.rank] ?? C.attention }}>
            {`· ${card.rank}º no ranking`}
          </span>
        )}
      </div>
      <span style={{ marginTop: 6, fontSize: 28, color: C.muted }}>{`Corrida nº ${race.raceNumber}`}</span>
    </Frame>
  );
}

function Frame({ assets, children }: { assets: Assets; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "96px 88px 110px",
        color: C.fg,
        backgroundColor: C.bgDeep,
        backgroundImage: `radial-gradient(circle at 50% 30%, rgba(91,227,200,0.22), rgba(15,30,46,0) 55%), linear-gradient(180deg, ${C.bg} 0%, ${C.bgDeep} 100%)`,
      }}
    >
      {/* Marca + evento */}
      <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={assets.logoSrc} width={60} height={70} alt="" />
          <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1 }}>NeuroRace</span>
        </div>
        <span
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 3,
            color: C.gold,
            border: `2px solid ${C.gold}`,
            borderRadius: 999,
            padding: "10px 26px",
          }}
        >
          NEXT FIAP 2026
        </span>
      </div>

      {children}

      {/* Convite: empurrado para o rodapé */}
      <div style={{ display: "flex", marginTop: "auto", width: "100%", alignItems: "center", gap: 40 }}>
        <img
          src={assets.qrSrc}
          width={200}
          height={200}
          alt=""
          style={{ borderRadius: 16, backgroundColor: "#eef6f3" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 46, fontWeight: 700 }}>Controle com a mente.</span>
          <span style={{ fontSize: 34, color: C.muted }}>Jogue também:</span>
          <span style={{ fontSize: 34, color: C.attention }}>{assets.host}</span>
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children, style }: { children: string; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: 8, color: C.attention, ...style }}>{children}</span>
  );
}

function Name({ children, style }: { children: string; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        maxWidth: 900,
        fontWeight: 700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, width }: { label: string; value: string; width: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
        padding: "28px 0",
        borderRadius: 28,
        border: `2px solid ${C.border}`,
        backgroundColor: "rgba(26,42,61,0.7)",
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.muted }}>{label}</span>
      <span style={{ marginTop: 6, fontSize: 68, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/**
 * Ícones de traço (24×24) no lugar dos emojis do BADGE_INFO: o Satori só desenharia
 * emoji baixando uma fonte na hora do render.
 */
const BADGE_ICON: Record<Badge, ReactNode> = {
  LARGADA_RELAMPAGO: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  MENTE_DE_ACO: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  VIRADA_MENTAL: <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5" />,
  MODO_FLOW: (
    <path d="M2 7c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2M2 12c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2M2 17c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2" />
  ),
  CALMA_TOTAL: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />,
  FADIGA_ZERO: <path d="M4 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM22 11v2M6 10v4M10 10v4M14 10v4" />,
  RECORDE_PESSOAL: <path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2M6 3h12v7a6 6 0 0 1-12 0V3zM12 16v4M8 21h8" />,
  PRIMEIRA_CORRIDA: <path d="M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />,
};

function BadgeChip({ id, label }: { id: Badge; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 30px 16px 18px",
        borderRadius: 999,
        border: `2px solid rgba(255,215,0,0.55)`,
        backgroundColor: "rgba(255,215,0,0.08)",
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.gold}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {BADGE_ICON[id]}
      </svg>
      <span style={{ fontSize: 34, fontWeight: 700 }}>{label}</span>
    </div>
  );
}
