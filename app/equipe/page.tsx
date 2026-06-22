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
    <div className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <h1 className="text-center font-display text-4xl font-extrabold sm:text-5xl">
          Conheça a nossa <span className="text-gradient">equipe</span>
        </h1>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((member, i) => (
          <Reveal key={member.name} delay={i * 0.05}>
            <article className="group flex h-full flex-col items-center rounded-card border border-border bg-card/40 p-6 text-center transition-colors hover:border-cyan">
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-border transition-all group-hover:ring-cyan">
                <Image
                  src={member.photo}
                  alt={`Foto de ${member.name}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-fg-strong">
                {member.name}
              </h3>
              <p className="mt-1 text-sm text-cyan">{member.role}</p>
              <hr className="my-3 w-10 border-border" />
              <p className="text-sm text-fg-muted">{member.course}</p>
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`LinkedIn de ${member.name}`}
                className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:border-cyan hover:text-cyan"
              >
                <LinkedInIcon />
              </a>
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
