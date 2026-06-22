import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-20">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-2xl">
          ✉️
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-fg-strong">
          Confirme seu e-mail
        </h1>
        <p className="mt-3 leading-relaxed text-fg">
          Enviamos um link de confirmação
          {email ? (
            <>
              {" "}
              para <strong className="text-cyan">{email}</strong>
            </>
          ) : null}
          . Abra o e-mail e clique no link para ativar sua conta — só depois
          disso seu desempenho aparece aqui.
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          Não recebeu? Verifique a caixa de spam.
        </p>
        <Link href="/login" className={buttonClass("secondary", "mt-8 w-full")}>
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
