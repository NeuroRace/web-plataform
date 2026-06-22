import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/Reveal";
import mascotWinner from "@/public/assets/images/mascot-winner.png";

export const metadata: Metadata = {
  title: "Ranking",
  description: "O ranking ao vivo do NeuroRace.",
};

export default function RankingPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
      <Reveal>
        <Image
          src={mascotWinner}
          alt=""
          className="mx-auto h-auto w-40 opacity-90"
        />
        <h1 className="mt-6 font-display text-4xl font-extrabold sm:text-5xl">
          Ranking <span className="text-gradient">em breve</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-fg">
          O ranking ao vivo do {""}
          <span className="text-cyan">NEXT FIAP 2026</span> está sendo
          preparado junto com o backend, com privacidade desde o início (sem
          expor e-mails). Volte logo para disputar o topo.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <ButtonLink href="/dashboard">Ver meu desempenho</ButtonLink>
          <ButtonLink href="/sobre" variant="secondary">
            Conhecer o projeto
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  );
}
