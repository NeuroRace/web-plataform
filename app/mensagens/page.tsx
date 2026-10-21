import type { Metadata } from "next";
import { AcaoMensagem } from "@/components/mensagens/AcaoMensagem";

export const metadata: Metadata = {
  title: "Avisos por e-mail",
  robots: { index: false, follow: false },
};

// Destino dos links "Parar de receber" e "Não vou poder" dos e-mails da premiação (NEU-112).
export default async function MensagensPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { t } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <AcaoMensagem token={typeof t === "string" ? t : null} />
    </div>
  );
}
