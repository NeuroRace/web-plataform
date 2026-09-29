"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DisplayNameForm } from "@/components/ranking/DisplayNameForm";

const SKIP_KEY = "neurorace-onboarding-skipped";

// sessionStorage só existe no browser: no servidor o modal nasce fechado (sem mismatch de hidratação).
const noopSubscribe = () => () => {};
const readSkipped = () => sessionStorage.getItem(SKIP_KEY) === "true";
const serverSkipped = () => true;

export function OnboardingModal({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string | null;
}) {
  const skipped = useSyncExternalStore(noopSubscribe, readSkipped, serverSkipped);
  const [closed, setClosed] = useState(false);
  // Depois de salvar, o router.refresh() traz o apelido: o modal continua aberto
  // mostrando a confirmação, até a pessoa clicar em "Fechar".
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isOpen = !closed && (saved || (initialName === null && !skipped));

  function close() {
    if (!saved) sessionStorage.setItem(SKIP_KEY, "true");
    setClosed(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-md"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="glass-card relative w-full max-w-md p-6 shadow-2xl outline-none sm:p-8"
      >
        <h2 id="onboarding-title" className="mb-2 font-display text-2xl font-bold text-fg-strong">
          Bem-vindo ao NeuroRace!
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-fg">
          Para aparecer no ranking oficial do evento, escolha um apelido público. Você poderá
          alterar depois na aba de Perfil.
        </p>

        <DisplayNameForm userId={userId} initialName={initialName} onSaved={() => setSaved(true)} />

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={close}
            className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            {saved ? "Fechar" : "Pular por enquanto"}
          </button>
        </div>
      </div>
    </div>
  );
}
