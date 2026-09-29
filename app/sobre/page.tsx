import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { LiveSignal } from "@/components/signal/LiveSignal";
import { Readout } from "@/components/signal/Readout";
import { InstrumentPanel } from "@/components/signal/InstrumentPanel";

export const metadata: Metadata = {
  title: "O Projeto",
  description: "A ciência por trás do NeuroRace.",
};

export default function SobrePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 md:px-12 py-12">
      <Reveal>
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl text-attention w-fit mx-auto pb-1">
            O Projeto
          </h1>
          <p className="mt-4 text-lg text-fg leading-relaxed">
            Nascemos para transformar a crise da atenção contemporânea em uma oportunidade interativa de aprimoramento cognitivo.
          </p>
        </div>
      </Reveal>

      {/* --- FLUXO LINEAR (Inspirado no sobre.html) --- */}
      <div className="mt-12 flex flex-col gap-10">

        {/* Bloco 1: A Crise */}
        <Reveal delay={0.1}>
          <div className="glass-card p-8 sm:p-10">
            <div className="mb-4">
              <span className="text-attention font-mono text-xs tracking-widest uppercase font-bold mb-2 block">O Cenário Atual</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg-strong">A Crise da Atenção</h2>
            </div>
            <div className="w-12 h-1 bg-white/10 mb-6 rounded-full"></div>
            <p className="text-fg leading-relaxed text-base sm:text-lg max-w-4xl">
              Vivemos em uma era de excesso de estímulos digitais. Notificações constantes, múltiplas telas e o consumo acelerado de conteúdos superficiais estão moldando nosso cérebro. Esse ambiente tem levado a uma dificuldade crescente de manter a atenção, fenômeno que a ciência associa à queda no foco e até a impactos estruturais no cérebro a longo prazo.
            </p>
          </div>
        </Reveal>

        {/* Bloco 2: A Solução (Gráfico em Destaque) */}
        <Reveal delay={0.2}>
          <div className="glass-card p-8 sm:p-10 flex flex-col gap-8">
            <div>
              <span className="text-attention font-mono text-xs tracking-widest uppercase font-bold mb-2 block">Nossa Solução</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg-strong mb-6">O Conceito NeuroRace</h2>
              
              <div className="space-y-4 max-w-4xl">
                <p className="text-fg leading-relaxed text-base sm:text-lg">
                  Mais do que um jogo, é uma experiência imersiva: usando o sensor NeuroSky, nós lemos suas ondas cerebrais em tempo real.
                </p>
                <p className="text-fg leading-relaxed text-base sm:text-lg">
                  Quanto maior sua concentração, melhor seu desempenho. O NeuroRace capta a atividade elétrica cerebral através de EEG e a transforma numa curva viva de atenção.
                </p>
                <div className="w-12 h-1 bg-white/10 my-6 rounded-full"></div>
                <p className="text-attention leading-relaxed text-base sm:text-lg font-medium">
                  Na pista, a velocidade do seu personagem é controlada diretamente pelo seu nível de foco sob pressão.
                </p>
              </div>
            </div>
            
            {/* Gráfico 100% da largura, texto não divide espaço */}
            <div className="w-full relative mt-2">
              <div className="absolute -top-6 left-4 sm:left-10 z-10 animate-[bounce_4s_ease-in-out_infinite]">
                <div className="glass-card px-5 py-3 border border-attention/50 flex items-center gap-3 shadow-2xl backdrop-blur-xl bg-[#0f1e2e]/80">
                   <div className="w-2.5 h-2.5 rounded-full bg-attention animate-pulse"></div>
                   <div>
                     <p className="text-[10px] text-fg-muted font-bold tracking-widest uppercase">Atenção</p>
                     <p className="text-3xl font-display font-bold text-attention leading-none mt-1">78%</p>
                   </div>
                </div>
              </div>
              
              <div className="absolute -bottom-6 right-4 sm:right-10 z-10 animate-[bounce_5s_ease-in-out_infinite_reverse]">
                <div className="glass-card px-5 py-3 border border-white/10 flex items-center gap-3 shadow-2xl backdrop-blur-xl bg-[#0f1e2e]/80">
                   <div className="text-2xl">⚡</div>
                   <div>
                     <p className="text-[10px] text-fg-muted font-bold tracking-widest uppercase">Velocidade</p>
                     <p className="text-2xl font-mono font-bold text-fg-strong leading-none mt-1">↑↑ MAX</p>
                   </div>
                </div>
              </div>

              {/* Gráfico Maior e Contínuo */}
              <InstrumentPanel className="w-full relative z-0 h-[250px] sm:h-[300px] flex flex-col justify-end">
                <LiveSignal mode="demo" height={270} />
              </InstrumentPanel>
            </div>
          </div>
        </Reveal>

        {/* Bloco 3: A Ciência por Trás */}
        <Reveal delay={0.3}>
          <div className="glass-card p-8 sm:p-10">
            <div className="mb-4">
              <span className="text-attention font-mono text-xs tracking-widest uppercase font-bold mb-2 block">Fundamentação Teórica</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg-strong">A Ciência por Trás</h2>
            </div>
            <div className="w-12 h-1 bg-white/10 mb-8 rounded-full"></div>
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-0">
              <div className="relative md:pr-10">
                <h3 className="font-display text-lg font-bold text-attention mb-3">Neuroplasticidade</h3>
                <p className="text-fg text-base leading-relaxed">
                  A atenção não é estática. O cérebro reorganiza redes neurais com prática. Intervenções breves no NeuroRace geram ganhos reais no controle executivo da mente.
                </p>
              </div>
              <div className="relative md:px-10 md:border-l md:border-white/10">
                <h3 className="font-display text-lg font-bold text-attention mb-3">Neurofeedback Real</h3>
                <p className="text-fg text-base leading-relaxed">
                  Ao ver o resultado direto do seu foco, você aprende instantaneamente a modular a própria atividade elétrica cerebral por recompensa.
                </p>
              </div>
              <div className="relative md:pl-10 md:border-l md:border-white/10">
                <h3 className="font-display text-lg font-bold text-attention mb-3">O Sensor BCI</h3>
                <p className="text-fg text-base leading-relaxed">
                  O headset NeuroSky lê sinais de EEG na testa e envia a biometria para nossa nuvem. Essa telemetria vira o combustível do seu personagem na Unreal Engine.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Bloco 4: Pilares / Valores */}
        <Reveal delay={0.4}>
          <div className="glass-card p-8 sm:p-10">
            <div className="mb-4">
              <span className="text-attention font-mono text-xs tracking-widest uppercase font-bold mb-2 block">Nosso Propósito</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-fg-strong">Valores e Objetivos</h2>
            </div>
            <div className="w-12 h-1 bg-white/10 mb-8 rounded-full"></div>
            
            <div className="grid md:grid-cols-3 gap-8 md:gap-0">
              <div className="relative md:pr-10">
                <h3 className="font-display text-lg font-bold text-attention mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-attention"></span> Educar
                </h3>
                <p className="text-fg text-base leading-relaxed">Mostrar de forma lúdica que o foco é uma habilidade treinável e não um dom estático.</p>
              </div>
              <div className="relative md:px-10 md:border-l md:border-white/10">
                <h3 className="font-display text-lg font-bold text-attention mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-attention"></span> Inspirar
                </h3>
                <p className="text-fg text-base leading-relaxed">Despertar a consciência sobre o impacto do uso de telas e a necessidade de cultivar atenção.</p>
              </div>
              <div className="relative md:pl-10 md:border-l md:border-white/10">
                <h3 className="font-display text-lg font-bold text-attention mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-attention"></span> Inovar
                </h3>
                <p className="text-fg text-base leading-relaxed">Integrar e-sports, neurociência e cloud computing para redefinir o desenvolvimento humano.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.7} className="mt-12 flex justify-center">
        <ButtonLink href="/dashboard" className="px-10">Acessar meu Dashboard</ButtonLink>
      </Reveal>
    </div>
  );
}
