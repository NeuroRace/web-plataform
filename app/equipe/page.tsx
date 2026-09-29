import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { team } from "@/lib/site";

export const metadata: Metadata = {
  title: "Desenvolvedores",
  description: "Conheça a equipe por trás do NeuroRace.",
};

export default function EquipePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <Reveal>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl mb-12 text-center text-attention w-fit mx-auto pb-1">
          Nossa Equipe
        </h1>
      </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pb-24">
          {team.map((member, i) => (
            <Reveal key={member.name} delay={i * 0.05}>
              <article className="group relative flex h-full flex-col justify-between overflow-hidden glass-card p-5 transition-all hover:border-white/20 hover:bg-white/10 hover:shadow-2xl">
                
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full ring-2 ring-border/50 transition-all duration-300 group-hover:ring-attention group-hover:ring-offset-2 group-hover:ring-offset-bg">
                    <Image
                      src={member.photo}
                      alt={`Foto de ${member.name}`}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-fg-strong">
                    {member.name}
                  </h3>
                  <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-attention">
                    {member.role}
                  </p>
                </div>

                <div className="mt-5 flex flex-col items-center border-t border-hairline/50 pt-4 text-center">
                  <p className="text-xs font-medium text-fg-strong">{member.course}</p>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn de ${member.name}`}
                    className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/50 text-attention transition-all hover:bg-attention hover:text-bg hover:shadow-[0_0_12px_-2px_var(--color-attention)]"
                  >
                    <LinkedInIcon />
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 17.34V10.5H6.06v6.84h2.28zM7.2 9.5a1.32 1.32 0 1 0 0-2.64 1.32 1.32 0 0 0 0 2.64zm10.14 7.84v-3.76c0-2.01-1.07-2.94-2.5-2.94-1.16 0-1.67.64-1.96 1.08v-.92h-2.28v6.54h2.28v-3.62c0-.95.18-1.87 1.36-1.87 1.16 0 1.18 1.09 1.18 1.93v3.56h2.4z" />
    </svg>
  );
}
