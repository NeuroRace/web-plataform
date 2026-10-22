"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { executarAcao, lerAcao, type ResultadoAcao } from "@/lib/mensagens";

type Estado = "pronto" | "enviando" | ResultadoAcao;

const TEXTO = {
  sair: {
    icone: "✉️",
    titulo: "Parar de receber e-mails",
    corpo: "Você não vai mais receber avisos do NeuroRace neste e-mail: nem de corrida, nem de prêmio.",
    aviso: null,
    botao: "Parar de receber",
    feito: "Pronto. Você não vai mais receber e-mails do NeuroRace.",
  },
  recusar: {
    icone: "🎁",
    titulo: "Abrir mão do prêmio",
    corpo: "Não vai conseguir buscar no estande? Ao confirmar, o prêmio passa para o próximo colocado.",
    aviso: "Não dá para desfazer.",
    botao: "Não vou poder buscar",
    feito: "Pronto. O prêmio passou para o próximo colocado. Valeu por jogar!",
  },
} as const;

const RESULTADO: Record<"ja_resolvido" | "link_invalido" | "erro", string> = {
  ja_resolvido: "Este prêmio já não está mais com você: o prazo passou, ele foi entregue ou você já abriu mão dele.",
  link_invalido: "Link inválido ou vencido. Se precisar, fale com a equipe no estande.",
  erro: "Não deu certo agora. Confira a conexão e tente de novo.",
};

/** Só age no clique: antivírus de e-mail abrem os links sozinhos. */
export function AcaoMensagem({ token }: { token: string | null }) {
  const acao = lerAcao(token);
  const [estado, setEstado] = useState<Estado>("pronto");
  const resultadoRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (estado === "pronto" || estado === "enviando") return;
    // O botão some com o resultado: o foco vai para a mensagem (teclado e leitor de tela).
    resultadoRef.current?.focus();
    // Ação resolvida: o link (que vale até 90 dias) sai da URL, do histórico e do que se compartilha.
    // No erro ele fica, porque o "Tentar de novo" ainda precisa dele.
    if (estado !== "erro") window.history.replaceState(null, "", window.location.pathname);
  }, [estado]);

  if (!token || !acao) {
    return (
      <Moldura icone="🔗" tom="neutro" titulo="Link inválido">
        <p className="mt-3 leading-relaxed text-fg">
          Abra o link direto do e-mail do NeuroRace. Se ele não funcionar, fale com a equipe no estande.
        </p>
        <VoltarAoSite />
      </Moldura>
    );
  }

  const t = TEXTO[acao];
  const enviando = estado === "enviando";
  const decidido = estado !== "pronto" && estado !== "enviando";

  async function confirmar() {
    if (enviando || !token) return;
    setEstado("enviando");
    setEstado(await executarAcao(token));
  }

  return (
    <Moldura icone={estado === "feito" ? "✓" : t.icone} tom={acao === "recusar" ? "quente" : "frio"} titulo={t.titulo}>
      {!decidido && (
        <>
          <p className="mt-3 leading-relaxed text-fg">{t.corpo}</p>
          {t.aviso && <p className="mt-2 text-sm font-medium text-meditation">{t.aviso}</p>}
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            aria-busy={enviando}
            className={buttonClass(acao === "recusar" ? "warm" : "primary", "mt-8 w-full")}
          >
            {enviando ? "Confirmando…" : t.botao}
          </button>
        </>
      )}

      <div role={estado === "erro" ? "alert" : "status"} aria-live={estado === "erro" ? "assertive" : "polite"}>
        {decidido && (
          <p ref={resultadoRef} tabIndex={-1} className="mt-3 leading-relaxed text-fg outline-none">
            {estado === "feito" ? t.feito : RESULTADO[estado]}
          </p>
        )}
      </div>

      {estado === "erro" && (
        <button type="button" onClick={confirmar} className={buttonClass("secondary", "mt-6 w-full")}>
          Tentar de novo
        </button>
      )}
      <VoltarAoSite />
    </Moldura>
  );
}

function Moldura({
  icone,
  tom,
  titulo,
  children,
}: {
  icone: string;
  tom: "frio" | "quente" | "neutro";
  titulo: string;
  children: React.ReactNode;
}) {
  const anel = {
    frio: "bg-attention/10 border-attention/20 shadow-[0_0_15px_-3px_var(--color-attention)]",
    quente: "bg-meditation/10 border-meditation/25 shadow-[0_0_15px_-3px_var(--color-meditation)]",
    neutro: "bg-white/5 border-white/10",
  }[tom];
  return (
    <div className="w-full max-w-md glass-card p-8 text-center sm:p-10">
      <div
        aria-hidden
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full border text-2xl text-fg-strong ${anel}`}
      >
        {icone}
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-balance text-fg-strong">{titulo}</h1>
      {children}
    </div>
  );
}

function VoltarAoSite() {
  return (
    <Link href="/" className={buttonClass("ghost", "mt-4 w-full")}>
      Voltar para o site
    </Link>
  );
}
