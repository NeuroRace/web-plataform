import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CONSENT_TERM_VERSION } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o NeuroRace trata os seus dados de EEG: o que coletamos, para quê, por quanto tempo, com quem compartilhamos e como exercer seus direitos.",
};

/** Data da última revisão do texto. Mudança relevante exige novo aceite (nova versão do termo). */
const UPDATED_AT = "25/09/2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline pt-8">
      <h2 className="font-display text-xl font-semibold text-fg-strong sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 leading-relaxed text-fg">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  const mail = (
    <a href={`mailto:${site.privacyContact}`} className="text-cyan underline">
      {site.privacyContact}
    </a>
  );

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
        LGPD · Termo {CONSENT_TERM_VERSION} · Atualizada em {UPDATED_AT}
      </p>
      <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
        Política de <span className="text-gradient">Privacidade</span>
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-fg">
        O {site.name} lê sinais do seu cérebro (EEG) para transformar foco em
        velocidade. Esse é um <strong className="text-fg-strong">dado pessoal sensível</strong>{" "}
        (LGPD, art. 5º, II). Por isso, só ligamos uma corrida a você com a sua
        autorização, guardamos o mínimo e por pouco tempo.
      </p>

      <div className="mt-12 space-y-10">
        <Section title="Quem é o responsável">
          <p>
            Equipe {site.name} ({site.event.name}), um projeto de alunos da FIAP.
            Contato para qualquer assunto de privacidade: {mail}.
          </p>
        </Section>

        <Section title="O que coletamos">
          <p className="font-medium text-fg-strong">No estande, durante a corrida</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Seus níveis de <strong className="text-fg-strong">atenção</strong> e{" "}
              <strong className="text-fg-strong">relaxamento</strong>, segundo a
              segundo, e a qualidade do sinal do headset.
            </li>
            <li>
              As bandas de frequência do EEG. Nenhuma tela usa esse dado: estamos
              deixando de coletá-lo, e o que já foi gravado será apagado.
            </li>
            <li>O resultado e o tempo da corrida.</li>
            <li>Seu e-mail, só se você escolher correr com e-mail.</li>
          </ul>
          <p>
            A câmera só detecta o seu gesto. <strong className="text-fg-strong">Nenhuma imagem é gravada ou enviada.</strong>
          </p>
          <p className="font-medium text-fg-strong">No site</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>E-mail e senha da conta (a senha é guardada criptografada).</li>
            <li>O apelido que você escolher para o ranking.</li>
            <li>O registro da sua autorização: versão do termo, data e hora.</li>
          </ul>
        </Section>

        <Section title="Você escolhe">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-fg-strong">Correr sem e-mail:</strong> você joga
              normalmente e nada fica ligado a você.
            </li>
            <li>
              <strong className="text-fg-strong">Correr com e-mail:</strong> guardamos a
              corrida para você ver seu desempenho no site, aparecer no ranking e
              receber uma análise do seu foco.
            </li>
          </ul>
          <p>Menores de 18 anos correm sempre sem e-mail.</p>
        </Section>

        <Section title="Para que usamos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Mostrar o seu desempenho no painel “Meu Desempenho”.</li>
            <li>
              Exibir seu apelido e seu tempo no ranking público. Seu e-mail nunca
              aparece.
            </li>
            <li>
              Gerar a análise do NeuroCoach, a partir de médias do seu foco e
              relaxamento.
            </li>
          </ul>
          <p>
            A base legal é o seu <strong className="text-fg-strong">consentimento</strong>{" "}
            específico e destacado (LGPD, art. 11, I). Não usamos seus dados para
            publicidade e não os vendemos.
          </p>
        </Section>

        <Section title="Com quem compartilhamos">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-fg-strong">Supabase:</strong> banco de dados e
              login, onde os dados ficam guardados.
            </li>
            <li>
              <strong className="text-fg-strong">Groq:</strong> serviço de inteligência
              artificial que gera a análise do NeuroCoach. Recebe só médias por fase
              da corrida, o resultado e os tempos, sem nome, e-mail nem data.
            </li>
            <li>
              <strong className="text-fg-strong">Vercel:</strong> hospedagem do site.
            </li>
          </ul>
        </Section>

        <Section title="Por quanto tempo">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Os dados segundo a segundo são apagados{" "}
              <strong className="text-fg-strong">90 dias após a corrida</strong>.
            </li>
            <li>O tempo e a posição no ranking ficam enquanto você tiver conta.</li>
            <li>O registro da autorização fica enquanto houver dado ligado a você.</li>
          </ul>
        </Section>

        <Section title="Seus direitos">
          <p>
            Você pode, a qualquer momento e sem custo: confirmar se tratamos seus
            dados, acessá-los, corrigi-los, pedir que sejam anonimizados ou
            apagados, saber com quem os compartilhamos e retirar a sua autorização
            (LGPD, art. 18).
          </p>
          <p>
            A autorização pode ser retirada no{" "}
            <Link href="/dashboard" className="text-cyan underline">
              seu painel
            </Link>
            . Para os demais pedidos, escreva para {mail}.
          </p>
        </Section>

        <Section title="Segurança">
          <p>
            Cada conta só enxerga as próprias corridas: o banco aplica regras de
            acesso por usuário. O ranking público mostra apenas apelido e tempo.
          </p>
        </Section>

        <div className="rounded-card border border-cyan/40 bg-card p-5 text-sm leading-relaxed text-fg sm:p-6">
          <p className="font-medium text-fg-strong">Em implantação</p>
          <p className="mt-2">
            O fim da coleta das bandas de frequência, a exclusão automática após 90
            dias e o botão “excluir meus dados” estão sendo implantados. Até lá,
            pedidos de exclusão enviados para {mail} são atendidos manualmente.
          </p>
        </div>
      </div>
    </article>
  );
}
