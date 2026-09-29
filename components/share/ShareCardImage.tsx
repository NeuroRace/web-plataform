/* eslint-disable @next/next/no-img-element -- renderizado pelo Satori (next/og), que só entende <img> */
import type { ShareCardData } from "@/lib/share-card";
import { formatRaceTime } from "@/lib/telao";

/**
 * Card dos Stories (1080×1920) renderizado pelo `next/og` (Satori), NEU-88.
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

export function ShareCardImage({
  card,
  mascotSrc,
  logoSrc,
  qrSrc,
  host,
}: {
  card: ShareCardData;
  mascotSrc: string;
  logoSrc: string;
  qrSrc: string;
  host: string;
}) {
  const placeColor = card.rank ? (PLACE_COLOR[card.rank] ?? C.attention) : C.attention;

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
          <img src={logoSrc} width={60} height={70} alt="" />
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

      <img src={mascotSrc} width={560} height={502} alt="" style={{ marginTop: 70 }} />

      <span style={{ marginTop: 40, fontSize: 34, fontWeight: 700, letterSpacing: 8, color: C.attention }}>
        MEU MELHOR TEMPO
      </span>
      <span style={{ marginTop: 8, fontSize: 190, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
        {card.bestTime != null ? formatRaceTime(card.bestTime) : "–"}
      </span>
      <span
        style={{
          marginTop: 28,
          maxWidth: 900,
          fontSize: 72,
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {card.name}
      </span>

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
        <Stat label="FOCO MÉDIO" value={card.avgFocus != null ? `${card.avgFocus}%` : "–"} />
        <Stat label={card.races === 1 ? "CORRIDA" : "CORRIDAS"} value={String(card.races)} />
      </div>

      {/* Convite: empurrado para o rodapé */}
      <div style={{ display: "flex", marginTop: "auto", width: "100%", alignItems: "center", gap: 40 }}>
        <img
          src={qrSrc}
          width={200}
          height={200}
          alt=""
          style={{ borderRadius: 16, backgroundColor: "#eef6f3" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 46, fontWeight: 700 }}>Controle com a mente.</span>
          <span style={{ fontSize: 34, color: C.muted }}>Jogue também:</span>
          <span style={{ fontSize: 34, color: C.attention }}>{host}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 380,
        padding: "28px 0",
        borderRadius: 28,
        border: `2px solid ${C.border}`,
        backgroundColor: "rgba(26,42,61,0.7)",
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: C.muted }}>{label}</span>
      <span style={{ marginTop: 6, fontSize: 76, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
