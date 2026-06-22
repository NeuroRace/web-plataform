import { site } from "@/lib/site";

/**
 * Banner de votação do NEXT. O link fica em `site.event.voteUrl`.
 * Enquanto vazio, mostra apenas "Votação em breve" (estrutura pronta pra ativar
 * o link real no NEXT 2026, sem alarde de "finalista").
 */
export function VoteBanner() {
  const active = Boolean(site.event.voteUrl);

  return (
    <div className="bg-gradient-brand text-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-5 py-2.5 text-center text-sm">
        {active ? (
          <a
            href={site.event.voteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-bg/90 px-4 py-1 font-display font-semibold text-fg-strong transition-transform hover:scale-105"
          >
            🗳️ Votar no NeuroRace agora!
          </a>
        ) : (
          <span className="rounded-full bg-bg/20 px-4 py-1 font-medium">
            🗳️ Votação em breve
          </span>
        )}
      </div>
    </div>
  );
}
