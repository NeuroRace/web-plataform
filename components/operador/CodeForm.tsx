"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CodeReply } from "@/lib/operador";
import { validarCodigo } from "@/lib/operador-data";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { TONE } from "./tone";

/** Campo do código em destaque, com a resposta grande. O código nunca fica na tela depois de enviado. */
export function CodeForm({ onSent, onDenied }: { onSent: () => void; onDenied: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<CodeReply | null>(null);
  const digits = code.replace(/\D/g, "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (digits.length !== 6 || busy) return;
    setBusy(true);
    try {
      const res = await validarCodigo(createClient(), digits);
      if (res.ok) setReply(res.data);
      else if (res.erro === "sem_acesso") onDenied();
      else setReply({ tone: "alert", title: "Não deu para validar", detail: "Confira a internet e tente de novo" });
      setCode("");
      onSent();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card mt-6 p-5">
      <label htmlFor="codigo" className="font-display font-bold text-fg-strong">
        Código do prêmio
      </label>
      <div className="mt-3 flex gap-3">
        <input
          id="codigo"
          inputMode="numeric"
          autoComplete="off"
          maxLength={9}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-4 py-3 font-mono text-3xl font-bold tracking-[0.2em] text-fg-strong tabular-nums placeholder:text-border focus-visible:outline-2 focus-visible:outline-attention"
        />
        <button type="submit" disabled={digits.length !== 6 || busy} className={buttonClass("primary", "px-5")}>
          Validar
        </button>
      </div>
      {/* A região existe vazia: o leitor de tela anuncia a resposta quando ela chega. */}
      <div role="status" aria-live="polite">
        {reply && (
          <div className={cn("mt-4 rounded-xl border-2 px-4 py-3", TONE[reply.tone])}>
            <p className="font-display text-3xl font-bold">{reply.title}</p>
            {reply.detail && <p className="mt-1 text-fg">{reply.detail}</p>}
          </div>
        )}
      </div>
    </form>
  );
}
