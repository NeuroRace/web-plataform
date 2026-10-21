"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACAO_COM_MOTIVO,
  ACAO_LABEL,
  actionsFor,
  formatScoreExact,
  statusView,
  type OpAcao,
  type OpPremio,
} from "@/lib/operador";
import { executarAcao } from "@/lib/operador-data";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { TONE } from "./tone";

/** Um prêmio da fila: estado, contagem, desempate e as ações que o estado aceita. */
export function PremioRow({ premio: p, now, onDone }: { premio: OpPremio; now: number | null; onDone: () => void }) {
  const view = statusView(p, now ?? Date.parse(p.round_ends_at));
  const actions = actionsFor(p);
  const [pending, setPending] = useState<OpAcao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const needsReason = pending !== null && ACAO_COM_MOTIVO.has(pending);

  const run = async (acao: OpAcao) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await executarAcao(createClient(), p.id, acao, needsReason ? motivo : undefined);
      if (!res.ok) setMsg(res.erro === "sem_acesso" ? "Sem acesso" : "Não deu para salvar. Tente de novo.");
      else if (!res.data.feito) setMsg(res.data.mensagem ?? "O banco recusou a ação");
      else {
        setPending(null);
        setMotivo("");
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      aria-label={`${p.posicao}º ${p.display_name}: ${view.label}`}
      data-tone={view.tone}
      className={cn(
        "rounded-xl border bg-bg-elev/70 p-4",
        view.tone === "alert" ? "border-2 border-danger/70 bg-danger/5" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border font-display text-sm font-bold text-fg-muted">
          {p.posicao}º
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-fg-strong">{p.display_name}</p>
          {p.contato && <p className="truncate text-sm text-fg-muted">{p.contato}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-sm font-bold", TONE[view.tone].split(" ")[0])}>{view.label}</p>
          {view.countdown && (
            <p className="font-mono text-2xl font-bold text-fg-strong tabular-nums">{view.countdown}</p>
          )}
        </div>
      </div>
      {view.note && <p className={cn("mt-2 text-sm font-semibold", view.tone === "alert" ? "text-danger" : "text-meditation")}>{view.note}</p>}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-fg-muted">Desempate</summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt className="text-fg-muted">Tempo exato</dt>
          <dd className="font-mono text-fg-strong tabular-nums">{formatScoreExact(p.score)}</dd>
          <dt className="text-fg-muted">Atenção média</dt>
          <dd className="font-mono text-fg-strong tabular-nums">
            {p.atencao_media === null ? "—" : p.atencao_media.toFixed(1).replace(".", ",")}
          </dd>
        </dl>
      </details>

      {actions.length > 0 && pending === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a}
              type="button"
              disabled={busy}
              className={buttonClass(a === "mais_10_min" ? "secondary" : "ghost", "px-3 py-2 text-sm")}
              // +10 min não tira o prêmio de ninguém: vai direto. O resto pede confirmação.
              onClick={() => (a === "mais_10_min" ? void run(a) : setPending(a))}
            >
              {ACAO_LABEL[a]}
            </button>
          ))}
        </div>
      )}

      {pending !== null && (
        <form
          className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(pending);
          }}
        >
          <p className="text-sm text-fg-strong">
            {ACAO_LABEL[pending]}: <span className="font-semibold">{p.display_name}</span>, {p.round_name}?
          </p>
          {needsReason && (
            <label className="flex flex-col gap-1 text-sm text-fg">
              Motivo
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-fg-strong focus-visible:outline-2 focus-visible:outline-attention"
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || (needsReason && motivo.trim() === "")}
              className={buttonClass("primary", "px-4 py-2 text-sm")}
            >
              Confirmar
            </button>
            <button
              type="button"
              className={buttonClass("ghost", "px-4 py-2 text-sm")}
              onClick={() => {
                setPending(null);
                setMotivo("");
              }}
            >
              Voltar
            </button>
          </div>
        </form>
      )}
      {msg && <p className="mt-2 text-sm font-semibold text-danger">{msg}</p>}
    </li>
  );
}
