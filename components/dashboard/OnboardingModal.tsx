"use client";

import { useState, useEffect } from "react";
import { DisplayNameForm } from "@/components/ranking/DisplayNameForm";

export function OnboardingModal({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Só mostramos o modal se o apelido for null
    // e se o usuário não pulou a etapa nesta sessão
    if (initialName === null && !sessionStorage.getItem("neurorace-onboarding-skipped")) {
      setIsOpen(true);
    }
  }, [initialName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md glass-card p-6 sm:p-8 shadow-2xl relative">
        <h2 className="font-display text-2xl font-bold text-fg-strong mb-2">
          Bem-vindo ao NeuroRace!
        </h2>
        <p className="text-fg mb-6 text-sm leading-relaxed">
          Para aparecer no ranking oficial do evento, escolha um apelido público. 
          Você poderá alterar depois na aba de Perfil.
        </p>
        
        <DisplayNameForm 
          userId={userId} 
          initialName={initialName} 
          onSaved={() => {
            // Em vez de fechar imediatamente, apenas deixamos a mensagem
            // de sucesso do form aparecer.
            // Atualizamos o sessionStorage para não abrir de novo.
            sessionStorage.setItem("neurorace-onboarding-skipped", "true");
            
            // Damos um tempo para o usuário ler a mensagem antes de fechar o modal,
            // ou ele mesmo pode fechar no botão abaixo que mudaremos para "Continuar"
          }} 
        />

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => {
              sessionStorage.setItem("neurorace-onboarding-skipped", "true");
              setIsOpen(false);
            }}
            className="text-sm font-medium text-fg-muted hover:text-fg transition-colors"
          >
            {initialName === null ? "Pular por enquanto" : "Fechar"}
          </button>
        </div>
      </div>
    </div>
  );
}
