import { site } from "@/lib/site";

/**
 * Banner de votação do NEXT. O link fica em `site.event.voteUrl`.
 * Enquanto vazio, mostra apenas "Votação em breve" (estrutura pronta pra ativar
 * o link real no NEXT 2026, sem alarde de "finalista").
 */
export function VoteBanner() {
  const active = Boolean(site.event.voteUrl);

  return (
    <div className="border-b border-hairline bg-bg-elev text-fg">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-5 py-2.5 text-center font-mono text-xs uppercase tracking-wide">
        {active ? (
          <a
            href={site.event.voteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-attention px-4 py-1 font-semibold text-bg transition-transform hover:scale-[1.03]"
          >
            Votar no NeuroRace
          </a>
        ) : (
          <span className="text-fg-muted">
            Votação <span className="text-attention">em breve</span> · {site.event.name}
          </span>
        )}
      </div>
    </div>
  );
}
