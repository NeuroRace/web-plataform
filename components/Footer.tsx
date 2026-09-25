import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-bg">
      <div className="mx-auto max-w-4xl px-5 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-fg-muted">
          © {year} {site.name} — {site.tagline}
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Projeto desenvolvido para o {site.event.name}.
        </p>
        <p className="mx-auto mt-8 max-w-2xl text-xs leading-relaxed text-fg-muted">
          <strong className="text-fg">Proteção de Dados:</strong> sinais de EEG
          são dado pessoal sensível (Lei nº 13.709/2018). Só ligamos sua corrida
          ao seu e-mail com a sua autorização, e você pode retirá-la quando
          quiser. Saiba o que coletamos, por quanto tempo e com quem
          compartilhamos na{" "}
          <Link href="/privacidade" className="text-cyan underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
