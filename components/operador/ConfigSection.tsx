"use client";

import { useState } from "react";
import type { OpConfig } from "@/lib/operador";
import { formatEventTime } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Key = "pausa_geral" | "passar_sozinho";

/** Interruptores que o operador usa na hora; os números ficam só para conferir. */
export function ConfigSection({
  config,
  onChange,
}: {
  config: OpConfig;
  onChange: (m: Partial<OpConfig>) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  // Qual interruptor não salvou: o operador não pode achar que pausou sem ter pausado.
  const [failed, setFailed] = useState<Key | null>(null);
  const toggle = async (key: Key) => {
    setBusy(true);
    setFailed(null);
    try {
      if (!(await onChange({ [key]: !config[key] }))) setFailed(key);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="mt-10 rounded-xl border border-border bg-bg-elev/60 p-4">
      <summary className="cursor-pointer font-display font-bold text-fg-strong">Configuração</summary>
      <div className="mt-4 flex flex-col gap-3">
        <Toggle
          label="Pausa geral"
          hint="Nada anda sozinho enquanto estiver ligada"
          on={config.pausa_geral}
          busy={busy}
          failed={failed === "pausa_geral"}
          onClick={() => void toggle("pausa_geral")}
        />
        <Toggle
          label="Passar sozinho"
          hint="Prazo estourado passa o prêmio sem o operador"
          on={config.passar_sozinho}
          busy={busy}
          failed={failed === "passar_sozinho"}
          onClick={() => void toggle("passar_sozinho")}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-fg-muted">Carência</dt>
        <dd className="text-fg-strong">{config.carencia_min} min</dd>
        <dt className="text-fg-muted">Janela de retirada</dt>
        <dd className="text-fg-strong">{config.janela_min} min</dd>
        <dt className="text-fg-muted">Lembrete</dt>
        <dd className="text-fg-strong">{config.lembrete_min} min</dd>
        <dt className="text-fg-muted">Fila até o</dt>
        <dd className="text-fg-strong">{config.limite_fila}º</dd>
        <dt className="text-fg-muted">Automação ligada</dt>
        <dd className="text-fg-strong">{config.ligada_em ? `às ${formatEventTime(config.ligada_em)}` : "não"}</dd>
      </dl>
    </details>
  );
}

function Toggle({
  label,
  hint,
  on,
  busy,
  failed,
  onClick,
}: {
  label: string;
  hint: string;
  on: boolean;
  busy: boolean;
  failed: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={onClick}
        className="flex items-center justify-between gap-4 rounded-lg px-1 py-1 text-left disabled:opacity-60"
      >
        <span>
          <span className="block font-semibold text-fg-strong">{label}</span>
          <span className="block text-xs text-fg-muted">{hint}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            on ? "bg-attention" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-5 rounded-full bg-bg transition-[left]",
              on ? "left-6" : "left-1",
            )}
          />
        </span>
      </button>
      {failed && <p className="px-1 pt-1 text-sm font-semibold text-danger">Não mudou, tente de novo</p>}
    </div>
  );
}
