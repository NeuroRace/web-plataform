import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/Reveal";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";
import mascotWinner from "@/public/assets/images/mascot-winner.png";

export const metadata: Metadata = {
  title: "Ranking",
  description:
    "O ranking do NeuroRace por melhor tempo de corrida. Só apelidos — nenhum e-mail é exibido.",
};

// Depende da sessão para destacar a linha do próprio jogador.
export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // get_leaderboard é pública (security definer): funciona logado ou não.
  // O profile só é lido quando há sessão — a RLS escopa ao próprio usuário.
  const [{ data: board, error }, { data: profile }] = await Promise.all([
    supabase.rpc("get_leaderboard", { p_metric: "best_time", p_limit: 50 }),
    user
      ? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = board ?? [];
  const myName = profile?.display_name ?? null;
  const precisaDeApelido = Boolean(user) && !myName;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
      <Reveal>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Ranking <span className="text-attention">ao vivo</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Melhor tempo de corrida no NEXT FIAP 2026. Só apelidos — nenhum e-mail
          é exibido.
        </p>
      </Reveal>

      {precisaDeApelido && (
        <div className="mt-8 rounded-card border border-attention/30 bg-attention/5 p-5">
          <p className="font-medium text-fg-strong">
            Você ainda não tem um apelido.
          </p>
          <p className="mt-1 text-sm text-fg">
            Escolha um para aparecer aqui — sem apelido, suas corridas não
            entram no ranking.
          </p>
          <ButtonLink href="/dashboard" className="mt-4">
            Definir meu apelido
          </ButtonLink>
        </div>
      )}

      <div className="mt-8">
        {error ? (
          <p
            role="alert"
            className="rounded-card border border-border bg-surface/50 p-6 text-center text-fg"
          >
            Não consegui carregar o ranking agora. Tente recarregar a página.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-border bg-surface/40 p-8 text-center sm:p-10">
            <Image
              src={mascotWinner}
              alt=""
              className="mx-auto h-auto w-32 opacity-90"
            />
            <h2 className="mt-4 font-display text-2xl font-bold text-fg-strong">
              O ranking ainda está vazio
            </h2>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-fg">
              Ninguém completou uma corrida com apelido definido ainda. Jogue no
              estande do NeuroRace e seja o primeiro a aparecer aqui.
            </p>
            <ButtonLink href="/sobre" variant="secondary" className="mt-6">
              Conhecer o projeto
            </ButtonLink>
          </div>
        ) : (
          <LeaderboardTable rows={rows} highlight={myName} />
        )}
      </div>

      {!user && rows.length > 0 && (
        <p className="mt-8 text-center text-sm text-fg-muted">
          <ButtonLink href="/login" variant="ghost">
            Entre na sua conta
          </ButtonLink>{" "}
          para ver sua posição destacada.
        </p>
      )}
    </div>
  );
}
