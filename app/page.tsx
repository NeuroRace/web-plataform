import Image from "next/image";
import { VoteBanner } from "@/components/VoteBanner";
import { QuoteCarousel } from "@/components/QuoteCarousel";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";
import mascotRunning from "@/public/assets/images/mascot-running.png";
import mascotWinner from "@/public/assets/images/mascot-winner.png";
import concentracao from "@/public/assets/images/concentracao.png";

export default function Home() {
  return (
    <>
      <VoteBanner />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--color-cyan), transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
          <Reveal>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
              Onde a sua <br />
              <span className="text-fg-strong">mente</span> é o{" "}
              <span className="text-gradient">controle</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg">
              Já imaginou controlar um jogo apenas com o poder do seu foco? O
              NeuroRace transforma isso em realidade através de neurofeedback em
              tempo real.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink href="/sobre">Conheça o projeto</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">
                Meu desempenho
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex justify-center">
            <Image
              src={mascotRunning}
              alt="Mascote do NeuroRace correndo"
              className="h-auto w-full max-w-sm drop-shadow-[0_20px_40px_rgba(56,189,248,0.25)]"
              priority
            />
          </Reveal>
        </div>
      </section>

      <QuoteCarousel />

      {/* Conceito */}
      <section className="bg-bg-elev py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              O <span className="text-gradient">Conceito</span> do NeuroRace
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg">
              Mais do que um jogo, é uma{" "}
              <strong className="text-fg-strong">experiência imersiva</strong>:
              usando o sensor <strong className="text-cyan">NeuroSky</strong>,
              lemos suas <strong className="text-pink">ondas cerebrais</strong>{" "}
              em tempo real. Quanto maior sua concentração, melhor seu
              desempenho.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 flex justify-center">
            <Image
              src={concentracao}
              alt="Demonstração de concentração"
              className="h-auto w-full max-w-xs mix-blend-lighten"
            />
          </Reveal>
        </div>
      </section>

      {/* CTA: já jogou? */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-cyan sm:text-4xl">
              🎮 Já jogou no NeuroRace? 🏆
            </h2>
            <p className="mt-4 text-lg text-fg">
              Depois de se divertir no jogo, volte aqui e descubra como você
              mandou bem.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <ButtonLink href="/dashboard">Conferir meu desempenho</ButtonLink>
              <ButtonLink href="/ranking" variant="secondary">
                Ver o ranking global
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* NEXT FIAP */}
      <section className="bg-bg-elev py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              {site.event.name}
            </h2>
            <p className="mt-4 leading-relaxed text-fg">
              O NEXT é o maior festival de inovação e tecnologia da FIAP, onde
              alunos apresentam seus projetos mais incríveis em um dia de
              competições, demonstrações e prêmios.
            </p>
            <p className="mt-4 leading-relaxed text-fg">
              O <span className="text-cyan">NeuroRace</span> combina{" "}
              <span className="text-pink">neurociência</span>, tecnologia e
              gamificação numa experiência única.
            </p>
            <div className="mt-8">
              <ButtonLink
                href="https://www.fiap.com.br/acontece/next-fiap-festival/"
                variant="secondary"
                target="_blank"
              >
                Conheça o NEXT FIAP Festival
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="flex justify-center">
            <Image
              src={mascotWinner}
              alt="Mascote do NeuroRace vencedor"
              className="h-auto w-full max-w-xs drop-shadow-[0_20px_40px_rgba(255,31,143,0.25)]"
            />
          </Reveal>
        </div>
      </section>

      {/* Hashtags + social */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <h3 className="font-display text-2xl font-bold">
              Pronto para testar sua concentração?
            </h3>
            <p className="mt-3 text-fg">
              Visite nosso stand no {site.event.name}! Conecte o sensor NeuroSky
              e assuma o poder da sua mente.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="rounded-full border border-gold/40 px-4 py-1.5 text-sm font-medium text-gold">
                #NeuroRace
              </span>
              <span className="rounded-full border border-pink/40 px-4 py-1.5 text-sm font-medium text-pink">
                #NEXTFIAP
              </span>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href={site.social.linkedinShare}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted transition-colors hover:text-cyan"
              >
                LinkedIn
              </a>
              <a
                href={site.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted transition-colors hover:text-pink"
              >
                Instagram
              </a>
              <a
                href={site.social.twitterShare}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-fg-muted transition-colors hover:text-fg-strong"
              >
                X (Twitter)
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
