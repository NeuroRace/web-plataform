import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "O Projeto",
  description:
    "A ciência por trás do NeuroRace: neuroplasticidade, neurofeedback em tempo real e performance cognitiva gamificada.",
};

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="rounded-card border border-border bg-card/40 p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold text-fg-strong">
        {title}
      </h3>
      <div className="mt-3 space-y-3 leading-relaxed text-fg">{children}</div>
    </Reveal>
  );
}

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      {/* O Projeto */}
      <Reveal>
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          Conheça o <span className="text-gradient">NeuroRace</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg">
          Somos a ferramenta de performance cognitiva que gamifica o treino da
          sua atenção. Nascemos para transformar um desafio contemporâneo em uma
          oportunidade de aprimoramento e bem-estar cognitivo.
        </p>
      </Reveal>

      <div className="mt-10 space-y-5">
        <Block title="O Cenário Atual: A Crise da Atenção">
          <p>
            Vivemos em uma era de excesso de estímulos digitais. Notificações
            constantes, múltiplas telas e o consumo acelerado de conteúdos
            superficiais estão moldando nosso cérebro — levando a uma
            dificuldade crescente de manter a atenção.
          </p>
        </Block>
        <Block title="Nossa Solução: Performance Cognitiva Gamificada">
          <p>
            O NeuroRace transforma a atenção em uma experiência interativa: a
            velocidade do seu personagem é controlada diretamente pelo seu nível
            de foco, medido em tempo real por um dispositivo de ondas cerebrais
            (EEG). Cada corrida vira um exercício divertido de foco e
            autorregulação.
          </p>
        </Block>

        <div className="grid gap-5 sm:grid-cols-3">
          <Block title="Educar">
            <p>
              Mostrar de forma lúdica que o foco é uma habilidade que pode ser
              treinada e fortalecida.
            </p>
          </Block>
          <Block title="Inspirar">
            <p>
              Despertar consciência sobre o impacto do uso excessivo de telas e
              a importância da atenção.
            </p>
          </Block>
          <Block title="Inovar">
            <p>
              Integrar neurociência, tecnologia e entretenimento para o
              desenvolvimento humano.
            </p>
          </Block>
        </div>
      </div>

      {/* A Ciência */}
      <Reveal className="mt-20">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          A <span className="text-gradient">Ciência</span> por Trás do Foco
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg">
          O NeuroRace é construído sobre pesquisas que exploram a treinabilidade
          da atenção e a cognição humana na era digital.
        </p>
      </Reveal>

      <div className="mt-10 space-y-5">
        <Block title="Neuroplasticidade: o cérebro que se adapta">
          <p>
            A atenção não é estática. A neuroplasticidade demonstra que o
            cérebro pode reorganizar e fortalecer redes neurais com prática
            repetida — mesmo intervenções breves geram ganhos no controle
            executivo da atenção.
          </p>
        </Block>
        <Block title="Neurofeedback em tempo real">
          <p>
            Um headset de Eletroencefalografia (EEG) capta a atividade elétrica
            cerebral e o sistema a traduz num indicador de{" "}
            <span className="text-cyan">atenção</span> (0 a 100). Ao ver o
            resultado direto do seu foco — a velocidade no jogo — você aprende a
            modular a própria atividade cerebral.
          </p>
        </Block>
        <Block title="Como funciona o sensor NeuroSky">
          <p>
            O NeuroSky lê sinais de EEG na testa e envia, a cada instante, o
            nível de <span className="text-cyan">atenção</span> e{" "}
            <span className="text-pink">meditação</span>, além das bandas de
            ondas cerebrais. É essa telemetria que, no seu painel, vira a curva
            do seu foco ao longo da corrida.
          </p>
        </Block>
      </div>
    </div>
  );
}
