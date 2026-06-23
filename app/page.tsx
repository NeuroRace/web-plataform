import Image from "next/image";
import { VoteBanner } from "@/components/VoteBanner";
import { QuoteCarousel } from "@/components/QuoteCarousel";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { SectionLabel } from "@/components/signal/SectionLabel";
import { SignalDivider } from "@/components/signal/SignalDivider";
import { LiveSignal } from "@/components/signal/LiveSignal";
import { Readout } from "@/components/signal/Readout";
import { InstrumentPanel } from "@/components/signal/InstrumentPanel";
import { NeuralField } from "@/components/signal/NeuralField";
import { site } from "@/lib/site";
import mascotWinner from "@/public/assets/images/mascot-winner.png";
import concentracao from "@/public/assets/images/concentracao.png";

export default function Home() {
  return (
    <>
      <VoteBanner />

      {/* ── Hero (mobile-first: título → onda → readout → CTAs) ── */}
      <section className="relative overflow-hidden border-b border-hairline">
        <NeuralField className="absolute inset-0 h-full w-full opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-24">
          <Reveal variant="label">
            <SectionLabel>{"// Neurofeedback Engine · "}{site.event.name}</SectionLabel>
          </Reveal>
          <Reveal>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
              Sua mente,
              <br />
              medida em <span className="text-attention">tempo real</span>
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 max-w-md text-base leading-relaxed text-fg sm:text-lg">
              Um jogo movido pelo seu foco. Conecte o sensor NeuroSky e veja sua
              atenção virar desempenho — sem mouse, sem teclado.
            </p>
          </Reveal>

          <Reveal delay={0.16} className="mt-8">
            <InstrumentPanel title="Sinal ao vivo" live>
              <LiveSignal mode="demo" height={180} />
              <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline">
                <Readout className="p-4" label="Atenção" value="0.78" kind="attention" />
                <Readout className="p-4" label="Meditação" value="0.41" kind="meditation" />
              </div>
            </InstrumentPanel>
          </Reveal>

          <Reveal delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/sobre">Conheça o projeto</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Meu desempenho
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      <QuoteCarousel />

      {/* ── Conceito ── */}
      <section className="bg-bg-elev py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal variant="label">
            <SectionLabel index={2}>O Conceito</SectionLabel>
          </Reveal>
          <Reveal>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Quando seu <span className="text-attention">foco</span> vira controle
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg sm:text-lg">
              O sensor <strong className="text-fg-strong">NeuroSky</strong> lê suas
              ondas cerebrais em tempo real. Quanto maior a concentração, melhor o
              desempenho — e tudo fica registrado pra você revisitar depois.
            </p>
          </Reveal>
          <Reveal delay={0.12} className="mt-10 flex justify-center">
            <Image
              src={concentracao}
              alt="Demonstração de concentração"
              className="h-auto w-full max-w-xs"
            />
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5">
        <SignalDivider className="py-2" />
      </div>

      {/* ── Já jogou? ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <Reveal variant="label">
            <SectionLabel index={3} className="!text-center">Já jogou?</SectionLabel>
          </Reveal>
          <Reveal>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Confira como você <span className="text-attention">mandou bem</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 text-base text-fg sm:text-lg">
              Depois de jogar no estande, volte aqui e veja o replay do seu foco.
            </p>
          </Reveal>
          <Reveal delay={0.16} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard">Conferir meu desempenho</ButtonLink>
            <ButtonLink href="/ranking" variant="secondary">
              Ver o ranking
            </ButtonLink>
          </Reveal>
        </div>
      </section>

      {/* ── NEXT FIAP ── */}
      <section className="bg-bg-elev py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <div>
            <Reveal variant="label">
              <SectionLabel index={4}>{site.event.name}</SectionLabel>
            </Reveal>
            <Reveal>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Feito para o palco
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-4 leading-relaxed text-fg">
                O NEXT é o maior festival de inovação e tecnologia da FIAP. O
                NeuroRace combina{" "}
                <span className="text-attention">neurociência</span>, tecnologia e
                gamificação numa experiência única.
              </p>
            </Reveal>
            <Reveal delay={0.16} className="mt-8">
              <ButtonLink
                href="https://www.fiap.com.br/acontece/next-fiap-festival/"
                variant="secondary"
                target="_blank"
              >
                Conheça o NEXT FIAP Festival
              </ButtonLink>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="flex justify-center">
            <Image
              src={mascotWinner}
              alt="Mascote do NeuroRace vencedor"
              className="h-auto w-full max-w-xs"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Convite ao estande ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h3 className="font-display text-2xl font-bold">
              Pronto para testar sua concentração?
            </h3>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-3 text-fg">
              Visite nosso stand no {site.event.name}. Conecte o sensor NeuroSky e
              assuma o controle.
            </p>
          </Reveal>
          <Reveal delay={0.16} className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-hairline px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-fg-muted">
              #NeuroRace
            </span>
            <span className="rounded-full border border-hairline px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-fg-muted">
              #NEXTFIAP
            </span>
          </Reveal>
          <Reveal delay={0.24} className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href={site.social.linkedinShare}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              LinkedIn
            </a>
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              Instagram
            </a>
            <a
              href={site.social.twitterShare}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wide text-fg-muted transition-colors hover:text-attention"
            >
              X (Twitter)
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
