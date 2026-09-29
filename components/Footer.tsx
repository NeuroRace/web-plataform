import { site } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 bg-bg-elev/40 backdrop-blur-md">
      <div className="mx-auto max-w-4xl px-5 py-6 text-center">
        <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.14em] text-fg-muted">
          © {year} {site.name} — {site.tagline}
        </p>
        
        <p className="mx-auto mt-3 max-w-2xl text-[10px] sm:text-xs leading-relaxed text-fg-muted/70">
          <strong className="text-fg-muted">Proteção de Dados:</strong> Aqui seus dados estão protegidos, tudo conforme a LGPD.
        </p>
      </div>
    </footer>
  );
}
