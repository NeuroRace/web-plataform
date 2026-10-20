import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import mascotRunning from "@/public/assets/images/mascot-running.png";

/** `contact`: e-mail ou celular mascarado com que a pessoa entrou (NEU-175); vazio se nenhum. */
export function EmptyState({ contact }: { contact: string }) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center sm:p-10">
      <Image
        src={mascotRunning}
        alt=""
        className="mx-auto h-auto w-40 opacity-90"
      />
      <h2 className="mt-4 font-display text-2xl font-bold text-fg-strong">
        Ainda não temos corridas suas
      </h2>
      <p className="mt-3 leading-relaxed text-fg">
        Seu desempenho aparece aqui assim que você joga no estande do NeuroRace
        e a corrida é registrada.
      </p>
      <div className="mt-6 rounded-lg border border-border bg-bg/60 p-4 text-left text-sm text-fg">
        <p className="font-medium text-cyan">Como aparecer aqui:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-muted">
          <li>Jogue uma corrida com o sensor NeuroSky no estande.</li>
          <li>
            Use no site o{" "}
            <strong className="text-fg">mesmo e-mail ou celular</strong> que você
            deu no estande.
            {contact && (
              <>
                {" "}Você entrou com <strong className="text-fg">{contact}</strong>.
              </>
            )}
          </li>
          <li>Pronto: a corrida aparece aqui assim que é registrada.</li>
        </ol>
      </div>
      <ButtonLink href="/sobre" variant="secondary" className="mt-6">
        Saiba como funciona
      </ButtonLink>
    </div>
  );
}
