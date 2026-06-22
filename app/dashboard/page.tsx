import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildRaceSummaries, type TelemetryRow } from "@/lib/metrics";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const metadata: Metadata = { title: "Meu Desempenho" };

// Lê dados do usuário logado — depende de cookies de sessão.
export const dynamic = "force-dynamic";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Jogador";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defesa extra (o middleware já protege a rota).
  if (!user) redirect("/login?next=/dashboard");

  const email = user.email ?? "";

  // A RLS escopa tudo ao próprio usuário.
  const [{ data: racePlayers }, { data: telemetry }] = await Promise.all([
    supabase
      .from("race_players")
      .select("id, race_id, player_slot, started_at, finished_at")
      .order("started_at", { ascending: true }),
    supabase
      .from("telemetry_points")
      .select("race_player_id, t, attention, meditation")
      .order("t", { ascending: true }),
  ]);

  const summaries = buildRaceSummaries(
    racePlayers ?? [],
    (telemetry ?? []) as TelemetryRow[],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        Olá, <span className="text-gradient">{nameFromEmail(email)}</span>!
      </h1>
      <p className="mt-2 text-fg-muted">{email}</p>

      <div className="mt-8">
        {summaries.length === 0 ? (
          <EmptyState email={email} />
        ) : (
          <DashboardClient races={summaries} />
        )}
      </div>
    </div>
  );
}
