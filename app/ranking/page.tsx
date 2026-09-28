import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadRanking } from "@/lib/ranking-data";
import { TELAO_LIMIT } from "@/lib/ranking";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/Reveal";
import { RankingBoard, type RankingTab } from "@/components/ranking/RankingBoard";

export const metadata: Metadata = {
  title: "Ranking",
  description:
    "O ranking do NeuroRace por melhor tempo de corrida. Só apelidos — nenhum e-mail é exibido.",
};

// Depende da sessão para destacar a linha do próprio jogador.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RankingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Modo telão (NEU-111): /ranking?telao=1 — tela cheia para a TV do estande.
  const telao = first(params.telao) === "1";
  const aba = first(params.aba);
  const initialTab: RankingTab | undefined =
    aba === "evento" || aba === "rodada" ? aba : undefined;

  const supabase = await createClient();

  if (telao) {
    const snapshot = await loadRanking(supabase, new Date(), { limit: TELAO_LIMIT });
    return <RankingBoard initial={snapshot} mode="telao" initialTab={initialTab} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // get_leaderboard é pública (security definer): funciona logado ou não.
  // O profile só é lido quando há sessão — a RLS escopa ao próprio usuário.
  const [snapshot, { data: profile }] = await Promise.all([
    loadRanking(supabase),
    user
      ? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const hasRows = snapshot.event.rows.length > 0;
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
        <RankingBoard initial={snapshot} highlight={myName} initialTab={initialTab} />
      </div>

      {!user && hasRows && (
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
