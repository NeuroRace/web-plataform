"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PAINEL_REFRESH_MS, groupByRound, type OpConfig, type OpPainel } from "@/lib/operador";
import { loadPainel, mudarConfig, type OpResult } from "@/lib/operador-data";
import { formatEventTime } from "@/lib/ranking";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { CodeForm } from "./CodeForm";
import { ConfigSection } from "./ConfigSection";
import { PremioRow } from "./PremioRow";

/**
 * Painel de ops da premiação (NEU-114), para o celular do operador. Busca o painel a
 * cada 10 s com a aba visível; uma busca que falha mantém a tela e avisa. A contagem
 * segue o relógio do servidor (`agora`), não o do celular.
 */
export function OperadorPanel({
  initial,
  operador,
}: {
  initial: OpResult<OpPainel>;
  operador: string | null;
}) {
  const [painel, setPainel] = useState<OpPainel | null>(initial.ok ? initial.data : null);
  const [erro, setErro] = useState(initial.ok ? null : initial.erro);
  const [stale, setStale] = useState(false);
  // Diferença entre o relógio do servidor e o do celular, medida quando o painel chega.
  const offset = useRef<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const inFlight = useRef(false);

  const accept = useCallback((p: OpPainel) => {
    offset.current = Date.parse(p.agora) - Date.now();
    setPainel(p);
    setErro(null);
    setStale(false);
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await loadPainel(createClient());
      if (res.ok) accept(res.data);
      else {
        // Com o painel na tela, só "sem acesso" troca a tela; o resto vira aviso.
        setErro(res.erro === "erro" ? null : res.erro);
        setStale(true);
      }
    } catch (err) {
      console.error("op_painel: falha inesperada", err);
      setStale(true);
    } finally {
      inFlight.current = false;
    }
  }, [accept]);

  useEffect(() => {
    if (painel && offset.current === null) offset.current = Date.parse(painel.agora) - Date.now();
    const tick = () => setNow(Date.now() + (offset.current ?? 0));
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, 1_000);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
    // Só na montagem: depois, quem atualiza o offset é o `accept`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (erro === "sem_acesso") return;
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, PAINEL_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [erro, refresh]);

  if (erro === "sem_acesso") {
    return (
      <Notice title="Sem acesso">
        {operador ? `A conta ${operador} não está na lista de operadores. ` : "Esta conta não está na lista de operadores. "}
        Peça ao Pedro para incluir o seu e-mail.
      </Notice>
    );
  }
  if (!painel) {
    return erro === "fora_do_ar" ? (
      <Notice title="A premiação ainda não está no ar">
        As funções da premiação ainda não foram publicadas no banco. Enquanto isso, o prêmio sai pelo telão e
        no papel. Esta tela confere de novo sozinha.
      </Notice>
    ) : (
      <Notice title="Não deu para carregar o painel">
        <button type="button" className={buttonClass("secondary", "mt-4")} onClick={() => void refresh()}>
          Tentar de novo
        </button>
      </Notice>
    );
  }

  const setConfig = async (mudancas: Partial<OpConfig>) => {
    const res = await mudarConfig(createClient(), mudancas);
    if (res.ok) setPainel((p) => (p ? { ...p, config: res.data } : p));
    else if (res.erro === "sem_acesso") setErro("sem_acesso");
    else setStale(true);
    return res.ok;
  };

  const { config } = painel;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-6 pb-16 sm:px-6">
      {config.pausa_geral && (
        <div
          role="alert"
          className="sticky top-2 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border-2 border-danger bg-bg-elev px-4 py-3"
        >
          <p className="font-display font-bold text-danger">Pausa geral ligada</p>
          <button
            type="button"
            className={buttonClass("secondary", "px-4 py-2 text-sm")}
            onClick={() => void setConfig({ pausa_geral: false })}
          >
            Retomar
          </button>
        </div>
      )}

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-fg-strong">Premiação</h1>
          <p className="mt-0.5 truncate text-sm text-fg-muted">
            {config.evento_atual}
            {!config.premiacao_ligada && " · automação desligada"}
          </p>
        </div>
        <p
          className={cn(
            "flex shrink-0 items-center gap-2 pt-1.5 font-mono text-xs font-bold",
            stale ? "text-fg-muted" : "text-attention",
          )}
        >
          <span aria-hidden className={cn("size-2 rounded-full", stale ? "bg-meditation" : "animate-pulse bg-attention")} />
          {stale ? "reconectando…" : "ao vivo"}
        </p>
      </header>

      <CodeForm onSent={() => void refresh()} onDenied={() => setErro("sem_acesso")} />

      {painel.premios.length === 0 ? (
        <p className="mt-8 text-center text-fg-muted">Nenhum prêmio ainda. A 1ª rodada fecha sozinha.</p>
      ) : (
        groupByRound(painel.premios).map((g) => (
          <section key={g.round_id} aria-labelledby={`rodada-${g.round_id}`} className="mt-8">
            <h2 id={`rodada-${g.round_id}`} className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg font-bold text-fg-strong">{g.round_name}</span>
              <span className="text-xs text-fg-muted">acabou às {formatEventTime(g.round_ends_at)}</span>
            </h2>
            <ol className="mt-3 flex flex-col gap-3">
              {g.premios.map((p) => (
                <PremioRow key={p.id} premio={p} now={now} onDone={() => void refresh()} />
              ))}
            </ol>
          </section>
        ))
      )}

      <ConfigSection config={config} onChange={setConfig} />

      <details className="mt-4 rounded-xl border border-border bg-bg-elev/60 p-4">
        <summary className="cursor-pointer font-display font-bold text-fg-strong">Registro</summary>
        {painel.registro.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">Nenhuma ação ainda.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2 text-sm">
            {painel.registro.map((r, i) => (
              <li key={`${r.em}-${i}`} className="flex gap-3">
                <span className="shrink-0 font-mono text-fg-muted tabular-nums">{formatEventTime(r.em)}</span>
                <span className="min-w-0 text-fg">
                  <span className="font-semibold text-fg-strong">{r.acao}</span>
                  {r.round_name && ` · ${r.round_name}`}
                  {r.detalhe && ` · ${r.detalhe}`}
                  <span className="block truncate text-xs text-fg-muted">{r.operador}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
      <div className="glass-card p-6">
        <h1 className="font-display text-2xl font-bold text-fg-strong">{title}</h1>
        <div className="mt-3 text-fg">{children}</div>
      </div>
    </div>
  );
}
