import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnTelemetry } from "@/lib/supabase/telemetry";
import { DEMO_RACE } from "@/lib/coach/demo";
import { buildRaceSummaries, type TelemetryRow, type RaceSummary } from "@/lib/metrics";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DisplayNameForm } from "@/components/ranking/DisplayNameForm";

export const metadata: Metadata = { title: "Meu Desempenho" };

export const dynamic = "force-dynamic";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Jogador";
}

// Corrida demo caso ative via query param (?demo=true). 1 amostra/s, para o NeuroCoach
// ter dados suficientes (lib/coach/demo.ts).
const DEMO_SUMMARIES: RaceSummary[] = [DEMO_RACE];

interface DashboardPageProps {
  searchParams: Promise<{ demo?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const isDemo = params.demo === "true";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const email = user.email ?? "";

  const [{ data: racePlayers }, telemetry, { data: profile }] =
    await Promise.all([
      supabase
        .from("race_players")
        .select("id, race_id, player_slot, started_at, finished_at")
        .order("started_at", { ascending: true }),
      // Paginado (NEU-115): consulta única é cortada em 1000 linhas pelo PostgREST.
      // Erro de leitura mantém o comportamento anterior: painel sem telemetria.
      loadOwnTelemetry(supabase).catch(() => [] as TelemetryRow[]),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const realSummaries = buildRaceSummaries(
    racePlayers ?? [],
    telemetry,
  );

  const showDemo = isDemo && realSummaries.length === 0;
  const summaries = showDemo ? DEMO_SUMMARIES : realSummaries;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        Olá, <span className="text-gradient">{nameFromEmail(email)}</span>!
      </h1>
      <p className="mt-2 text-fg-muted">{email}</p>

      <div className="mt-8 rounded-card border border-border bg-surface/40 p-5 sm:p-6">
        <DisplayNameForm
          userId={user.id}
          initialName={profile?.display_name ?? null}
        />
      </div>

      <div className="mt-8">
        {summaries.length === 0 ? (
          <EmptyState email={email} />
        ) : (
          <DashboardClient races={summaries} demo={showDemo} />
        )}
      </div>
    </div>
  );
}