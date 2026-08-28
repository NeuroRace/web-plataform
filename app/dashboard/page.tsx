import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

// Corrida demo caso ative via query param (?demo=true)
const DEMO_SUMMARIES: RaceSummary[] = [
  {
    racePlayerId: "demo-race-01",
    raceId: "race-demo-uuid-1",
    slot: 1,
    startedAt: new Date(Date.now() - 65000).toISOString(),
    finishedAt: new Date().toISOString(),
    metrics: {
      avgAttention: 64.2,
      peakAttention: 92.0,
      focusZonePct: 61.7,
      avgMeditation: 48.0,
      durationSeconds: 62.4,
      sampleCount: 62,
    },
    series: [
      { t: 0, attention: 70, meditation: 50 },
      { t: 5, attention: 88, meditation: 52 },
      { t: 10, attention: 85, meditation: 50 },
      { t: 18, attention: 82, meditation: 51 },
      { t: 25, attention: 76, meditation: 45 },
      { t: 35, attention: 78, meditation: 46 },
      { t: 42, attention: 31, meditation: 47 },
      { t: 50, attention: 33, meditation: 48 },
      { t: 62, attention: 34, meditation: 47 },
    ],
  },
];

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

  const [{ data: racePlayers }, { data: telemetry }, { data: profile }] =
    await Promise.all([
      supabase
        .from("race_players")
        .select("id, race_id, player_slot, started_at, finished_at")
        .order("started_at", { ascending: true }),
      supabase
        .from("telemetry_points")
        .select("race_player_id, t, attention, meditation")
        .order("t", { ascending: true }),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const realSummaries = buildRaceSummaries(
    racePlayers ?? [],
    (telemetry ?? []) as TelemetryRow[],
  );

  const summaries = isDemo && realSummaries.length === 0 ? DEMO_SUMMARIES : realSummaries;

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
          <DashboardClient races={summaries} />
        )}
      </div>
    </div>
  );
}