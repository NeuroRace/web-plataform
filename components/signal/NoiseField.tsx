"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { makeNoiseSegments } from "@/lib/signal";
import { cn } from "@/lib/utils";

const VB_W = 200;
const VB_H = 300;

/** Campo de ruído decorativo (inverso do NeuralField). Leve, pausa offscreen, respeita reduced-motion. */
export function NoiseField({
  intensity = "low",
  className,
}: {
  intensity?: "low" | "high";
  className?: string;
}) {
  const count = intensity === "high" ? 34 : 18;
  const segments = useMemo(
    () => makeNoiseSegments({ count, seed: 13, width: VB_W, height: VB_H }),
    [count],
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.02 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={cn("pointer-events-none", className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full text-fg-muted"
      >
        <g
          className="animate-noise-drift"
          data-playing={String(visible)}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        >
          {segments.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeOpacity={s.opacity} />
          ))}
        </g>
      </svg>
    </div>
  );
}
