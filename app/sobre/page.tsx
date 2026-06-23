import type { Metadata } from "next";
import { CinematicSection } from "@/components/signal/CinematicSection";
import { NoiseField } from "@/components/signal/NoiseField";
import { LiveSignal } from "@/components/signal/LiveSignal";
import { Readout } from "@/components/signal/Readout";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "O Projeto",
  description:
    "A ciência por trás do NeuroRace: neuroplasticidade, neurofeedback em tempo real e performance cognitiva gamificada.",
};

export default function SobrePage() {
  return (
    <div>
      {/* 01 — Abertura */}
      <CinematicSection
        index={1}
        label="O Projeto · NEXT FIAP 2026"
        tone="noise"
        background={<NoiseField intensity="low" className="h-full w-full opacity-60" />}
      >
        <Reveal>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            A atenção virou o<br />
            recurso mais <span className="text-fg-muted">disputado.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            O NeuroRace nasce para transformar esse desafio em treino: foco que
            vira jogo, medido em tempo real.
          </p>
        </Reveal>
        <p className="mt-10 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
          ▾ role
        </p>
      </CinematicSection>

      {/* 02 — O Ruído (a crise) */}
      <CinematicSection
        index={2}
        label="O Cenário"
        tone="noise"
        background={<NoiseField intensity="high" className="h-full w-full opacity-70" />}
      >
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight text-fg-strong sm:text-5xl">
            Telas. Notificações.
            <br />
            <span className="text-fg-muted">Dispersão.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            Vivemos numa era de excesso de estímulos digitais. Notificações
            constantes, múltiplas telas e o consumo acelerado de conteúdos
            superficiais estão moldando nosso cérebro — levando a uma dificuldade
            crescente de manter a atenção.
          </p>
        </Reveal>
      </CinematicSection>

      {/* 03 — A Virada (ruído → sinal) */}
      <CinematicSection index={3} label="A Virada" tone="transition">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Do ruído ao <span className="text-attention">sinal.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            O foco não é ruído — é sinal. O NeuroRace lê a sua atividade cerebral e
            a transforma numa curva viva de atenção.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
            <LiveSignal mode="demo" className="w-full" />
          </div>
        </Reveal>
      </CinematicSection>

      {/* 04 — A Solução */}
      <CinematicSection index={4} label="A Solução" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Seu foco vira <span className="text-attention">velocidade.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg">
            A velocidade do seu personagem é controlada diretamente pelo seu nível
            de foco, medido em tempo real por um headset de EEG. Cada corrida vira
            um exercício divertido de foco e autorregulação.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex items-center gap-4">
            <Readout label="Atenção" value="78" kind="attention" suffix="%" />
            <span aria-hidden className="text-2xl text-attention">
              →
            </span>
            <Readout label="Velocidade" value="↑↑" kind="neutral" />
          </div>
        </Reveal>
      </CinematicSection>

      {/* 05 — A Ciência */}
      <CinematicSection index={5} label="A Ciência por trás do foco" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Não é mágica.
            <br />
            <span className="text-attention">É neurociência.</span>
          </h2>
        </Reveal>

        <div className="mt-12 space-y-12">
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              Neuroplasticidade
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              A atenção não é estática. O cérebro reorganiza e fortalece redes
              neurais com prática repetida — mesmo intervenções breves geram ganhos
              no controle executivo da atenção.
            </p>
          </Reveal>
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              Neurofeedback em tempo real
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              Um headset de EEG capta a atividade elétrica cerebral e o sistema a
              traduz num indicador de <span className="text-attention">atenção</span>{" "}
              (0 a 100). Ao ver o resultado direto do seu foco, você aprende a
              modular a própria atividade cerebral.
            </p>
          </Reveal>
          <Reveal>
            <h3 className="font-display text-xl font-semibold text-fg-strong">
              O sensor NeuroSky
            </h3>
            <p className="mt-3 max-w-xl leading-relaxed text-fg">
              O NeuroSky lê sinais de EEG na testa e envia, a cada instante, o nível
              de <span className="text-attention">atenção</span> e{" "}
              <span className="text-meditation">meditação</span>, além das bandas de
              ondas cerebrais. É essa telemetria que, no seu painel, vira a curva do
              seu foco ao longo da corrida.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs text-fg-muted">
              <span className="rounded-md border border-border px-2.5 py-1.5">EEG</span>
              <span aria-hidden>→</span>
              <span className="rounded-md border border-border px-2.5 py-1.5">
                atenção 0–100
              </span>
              <span aria-hidden>→</span>
              <span className="rounded-md border border-attention px-2.5 py-1.5 text-attention">
                velocidade
              </span>
            </div>
          </Reveal>
        </div>
      </CinematicSection>

      {/* 06 — Propósito + CTA */}
      <CinematicSection index={6} label="Propósito" tone="signal">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight sm:text-5xl">
            Educar. Inspirar.
            <br />
            <span className="text-attention">Inovar.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Reveal>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Educar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Mostrar de forma lúdica que o foco é uma habilidade que pode ser
              treinada e fortalecida.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Inspirar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Despertar consciência sobre o impacto do uso excessivo de telas e a
              importância da atenção.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h3 className="font-display text-lg font-semibold text-fg-strong">Inovar</h3>
            <p className="mt-2 leading-relaxed text-fg">
              Integrar neurociência, tecnologia e entretenimento para o
              desenvolvimento humano.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <div className="mt-14">
            <ButtonLink href="/dashboard">Veja o seu sinal</ButtonLink>
          </div>
        </Reveal>
      </CinematicSection>
    </div>
  );
}
