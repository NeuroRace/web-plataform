"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";

export const SHARE_IMAGE_URL = "/dashboard/compartilhar";
const FILE_NAME = "neurorace-stories.png";

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILE_NAME;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Card dos Stories no dashboard (NEU-88): prévia + compartilhar/baixar.
 * No celular, "Compartilhar" abre o menu do sistema com o PNG (Instagram direto);
 * sem suporte a arquivo no `navigator.share`, baixa a imagem.
 */
export function ShareCard() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function share() {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(SHARE_IMAGE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`share_image_${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], FILE_NAME, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu desempenho no NeuroRace" });
      } else {
        download(blob);
      }
    } catch (e) {
      // Fechar o menu de compartilhar sem escolher nada não é erro.
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="share-title"
      className="glass-card mb-6 flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-8"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- PNG gerado por rota dinâmica, sem otimização */}
      <img
        src={SHARE_IMAGE_URL}
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
          Melhor tempo, posição no ranking e foco médio, no formato do Instagram. Só o seu
          apelido aparece; o e-mail nunca.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={share} disabled={busy} className={buttonClass("primary")}>
            {busy ? "Gerando..." : "Compartilhar"}
          </button>
          <a href={SHARE_IMAGE_URL} download={FILE_NAME} className={buttonClass("secondary")}>
            Baixar imagem
          </a>
        </div>
        {error && (
          <p role="alert" className="text-sm text-meditation">
            Não consegui gerar a imagem agora. Tente de novo em instantes.
          </p>
        )}
      </div>
    </section>
  );
}
