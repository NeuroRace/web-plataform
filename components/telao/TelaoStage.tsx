"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { STAGE_H, STAGE_W } from "@/lib/telao";

/**
 * Palco fixo de 1920×1080 escalado para caber na tela (TV, projetor, notebook).
 * O layout é desenhado em pixels da TV; a escala mantém a composição idêntica
 * em qualquer resolução, com faixas escuras se a proporção não for 16:9.
 */
export function TelaoStage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const fit = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-bg">
      <div
        className="absolute top-1/2 left-1/2 origin-center"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
          // Antes de medir a tela, não mostra o palco no tamanho errado.
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
