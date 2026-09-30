"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export const SHARE_IMAGE_URL = "/dashboard/compartilhar";

type Model = "tempo" | "arquetipo";

const MODELS: Record<Model, { label: string; src: string; file: string }> = {
  tempo: { label: "Melhor tempo", src: SHARE_IMAGE_URL, file: "neurorace-stories.png" },
  arquetipo: {
    label: "Meu arquétipo",
    src: `${SHARE_IMAGE_URL}?modelo=arquetipo`,
    file: "neurorace-arquetipo.png",
  },
};

/** Depois de entrar, volta para o painel, onde está o card. */
const LOGIN_AGAIN = "/login?next=%2Fdashboard";

type Failure = "falha" | "sessao";

class CardImageError extends Error {
  constructor(readonly reason: Failure) {
    super(`share_image_${reason}`);
  }
}

/**
 * Busca o PNG do card. Com a sessão expirada, o proxy redireciona para o /login e o
 * fetch segue o redirect: chega a página de login com 200, que não pode virar "imagem".
 */
async function fetchCardImage(src: string): Promise<Blob> {
  const res = await fetch(src, { cache: "no-store" });
  if (res.redirected || res.status === 401) throw new CardImageError("sessao");
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image/png")) {
    throw new CardImageError("falha");
  }
  return res.blob();
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Card dos Stories no dashboard (NEU-88): prévia + compartilhar/baixar.
 * No celular, "Compartilhar" abre o menu do sistema com o PNG (Instagram direto);
 * sem suporte a arquivo no `navigator.share`, baixa a imagem.
 * Com `archetype`, a pessoa escolhe entre o card do melhor tempo e o do arquétipo.
 */
export function ShareCard({ archetype = false }: { archetype?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [model, setModel] = useState<Model>("tempo");
  const current = MODELS[model];

  /** Compartilhar e baixar passam pela mesma busca conferida do PNG. */
  async function withImage(handle: (blob: Blob) => Promise<void> | void) {
    setBusy(true);
    setError(null);
    try {
      await handle(await fetchCardImage(current.src));
    } catch (e) {
      // Fechar o menu de compartilhar sem escolher nada não é erro.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof CardImageError ? e.reason : "falha");
      }
    } finally {
      setBusy(false);
    }
  }

  function share() {
    return withImage(async (blob) => {
      const file = new File([blob], current.file, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu desempenho no NeuroRace" });
      } else {
        download(blob, current.file);
      }
    });
  }

  return (
    <section
      aria-labelledby="share-title"
      className="glass-card mb-6 flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-8"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG gerado por rota dinâmica, sem otimização */}
      <img
        key={current.src}
        src={current.src}
        alt="Prévia do seu card para os Stories"
        width={135}
        height={240}
        className="h-60 w-[135px] shrink-0 rounded-xl border border-border bg-bg-elev object-cover"
      />
      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <h2 id="share-title" className="font-display text-2xl font-bold text-fg-strong">
          Seu card para os Stories
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-fg-muted">
          {model === "tempo"
            ? "Melhor tempo, posição no ranking e foco médio, no formato do Instagram."
            : "Seu arquétipo e suas conquistas da última corrida, no formato do Instagram."}{" "}
          Só o seu apelido aparece; o e-mail nunca.
        </p>
        {archetype && (
          <div role="group" aria-label="Modelo do card" className="flex rounded-full border border-border p-1">
            {(Object.keys(MODELS) as Model[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={model === m}
                onClick={() => {
                  setModel(m);
                  setError(null);
                }}
                className={
                  model === m
                    ? "rounded-full bg-attention px-4 py-1.5 text-sm font-medium text-bg"
                    : "rounded-full px-4 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
                }
              >
                {MODELS[m].label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={share} disabled={busy} className={buttonClass("primary")}>
            {busy ? "Gerando..." : "Compartilhar"}
          </button>
          {/* Link de verdade (salvar como, sem JS), mas o clique passa pela busca conferida. */}
          <a
            href={current.src}
            download={current.file}
            onClick={(e) => {
              e.preventDefault();
              if (!busy) void withImage((blob) => download(blob, current.file));
            }}
            className={buttonClass("secondary")}
          >
            Baixar imagem
          </a>
        </div>
        {error === "sessao" && (
          <p role="alert" className="text-sm text-meditation">
            Sua sessão expirou.{" "}
            <a href={LOGIN_AGAIN} className="underline">
              Entre de novo
            </a>{" "}
            para gerar o card.
          </p>
        )}
        {error === "falha" && (
          <p role="alert" className="text-sm text-meditation">
            Não consegui gerar a imagem agora. Tente de novo em instantes.
          </p>
        )}
      </div>
    </section>
  );
}
