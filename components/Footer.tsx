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
          <strong className="text-fg">Proteção de Dados:</strong> os dados
          coletados durante o jogo serão utilizados exclusivamente para
          identificar o(a) participante na entrega dos prêmios, sendo empregados
          apenas em <strong className="text-fg">{site.event.dataDate}</strong>,
          durante o <strong className="text-fg">{site.event.name}</strong>. Suas
          informações estão protegidas conforme a{" "}
          <strong className="text-fg">
            Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)
          </strong>
          .
        </p>
      </div>
    </footer>
  );
}
