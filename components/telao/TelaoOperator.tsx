"use client";

import { useEffect, useState } from "react";
import { buttonClass, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** Some depois de 3 s sem mexer o mouse: o público não vê botões na TV. */
const IDLE_MS = 3_000;

/**
 * Controles do operador, fora do palco: tela cheia, telão em lista (o do #11,
 * plano B) e sair. Aparecem ao mexer o mouse ou usar o teclado; somem sozinhos.
 */
export function TelaoOperator() {
  const [visible, setVisible] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      setVisible(true);
      clearTimeout(hide);
      hide = setTimeout(() => setVisible(false), IDLE_MS);
    };
    const sync = () => setFull(Boolean(document.fullscreenElement));
    window.addEventListener("pointermove", wake);
    window.addEventListener("keydown", wake);
    document.addEventListener("fullscreenchange", sync);
    return () => {
      clearTimeout(hide);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("fullscreenchange", sync);
    };
  }, []);

  return (
    <nav
      aria-label="Controles do telão"
      className={cn(
        "fixed top-4 right-4 z-[60] flex gap-3 rounded-card border border-border bg-bg-elev/95 p-2 transition-opacity duration-300",
        // Focar um botão pelo teclado também revela os controles.
        visible ? "opacity-100" : "pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100",
      )}
    >
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
      <ButtonLink href="/ranking?telao=1&modo=lista" variant="ghost" className="px-4 py-2 text-sm">
        Modo lista
      </ButtonLink>
      <ButtonLink href="/ranking" variant="ghost" className="px-4 py-2 text-sm">
        Sair do telão
      </ButtonLink>
    </nav>
  );
}
