"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SeriesPoint } from "@/lib/metrics";
import { makeDemoSeries } from "@/lib/signal";
import { metricsConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const VB_W = 1000;
const VB_H = 200;

/** Converte uma série em string de pontos para <polyline>, normalizando t e valor. */
function toPoints(series: SeriesPoint[], key: "attention" | "meditation"): string {
  const n = series.length;
  if (n < 2) return "";
  return series
    .map((p, i) => {
      const x = (i / (n - 1)) * VB_W;
      const v = p[key] ?? 0;
      const y = VB_H - (v / 100) * VB_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LiveSignal({
  mode = "demo",
  series,
  threshold = metricsConfig.focusZoneThreshold,
  height = 200,
  className,
}: {
  mode?: "demo" | "data";
  series?: SeriesPoint[];
  threshold?: number;
  height?: number;
  className?: string;
}) {
  const data = useMemo<SeriesPoint[]>(
    () => (mode === "demo" ? makeDemoSeries({ points: 64, seed: 11 }) : (series ?? [])),
    [mode, series],
  );

  const attPoints = useMemo(() => toPoints(data, "attention"), [data]);
  const medPoints = useMemo(() => toPoints(data, "meditation"), [data]);
  const thresholdY = VB_H - (threshold / 100) * VB_H;

  // Pausa a varredura fora da viewport (perf no mobile).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scanning = mode === "demo";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)} style={{ height }}>
      {/* grade de instrumento */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-hairline) 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, var(--color-hairline) 0 1px, transparent 1px 32px)",
        }}
      />
      {/* badge de honestidade (só demo) */}
      {mode === "demo" && (
        <span className="absolute right-2 top-2 z-10 rounded bg-bg/70 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-fg-muted">
          demonstração
        </span>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={
          mode === "demo"
            ? "Demonstração animada de um sinal de atenção e meditação"
            : "Replay do sinal de atenção e meditação da corrida"
        }
      >
        {/* linha de zona de foco */}
        <line
          x1="0"
          x2={VB_W}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--color-fg-muted)"
          strokeWidth="1"
          strokeDasharray="6 6"
          opacity="0.6"
        />
        {/* grupo que rola (200% de largura = série duplicada) para loop sem emenda */}
        <g
          className={scanning ? "animate-signal-scan" : undefined}
          data-playing={scanning ? String(visible) : undefined}
        >
          {[0, VB_W].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <polyline
                points={medPoints}
                fill="none"
                stroke="var(--color-meditation)"
                strokeWidth="2"
                strokeOpacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={attPoints}
                fill="none"
                stroke="var(--color-attention)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
      </svg>

      <span
        className="pointer-events-none absolute left-2 top-2 z-10 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-fg-muted"
        style={{ transform: `translateY(${(thresholdY / VB_H) * 100}%)` }}
        aria-hidden
      >
        Zona de foco
      </span>
    </div>
  );
}
