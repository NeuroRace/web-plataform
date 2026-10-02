import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadOwnRaces } from "@/lib/supabase/dashboard";
import { DEMO_RACE } from "@/lib/coach/demo";
import type { RaceSummary } from "@/lib/metrics";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DisplayNameForm } from "@/components/ranking/DisplayNameForm";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { ShareCard } from "@/components/share/ShareCard";
import { buildArchetypeCard } from "@/lib/share-card";
import { CollectionTab } from "@/components/collection/CollectionTab";
import { computeUnlocks } from "@/lib/collection/unlocks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Meu Desempenho" };

export const dynamic = "force-dynamic";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Jogador";
}

const DEMO_SUMMARIES: RaceSummary[] = [DEMO_RACE];

interface DashboardPageProps {
  searchParams: Promise<{ demo?: string; tab?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const isDemo = params.demo === "true";
  const activeTab = params.tab === "perfil" ? "perfil" : params.tab === "colecao" ? "colecao" : "desempenho";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const email = user.email ?? "";

  const { summaries: realSummaries, displayName } = await loadOwnRaces(supabase, user.id);

  const showDemo = isDemo && realSummaries.length === 0;
  const summaries = showDemo ? DEMO_SUMMARIES : realSummaries;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      {/* MODAL DE ONBOARDING (Item 1 da NEU-83) */}
      <OnboardingModal userId={user.id} initialName={displayName} />

      <h1 className="font-display text-3xl font-extrabold sm:text-4xl text-fg-strong">
        Olá, <span className="text-attention">{nameFromEmail(email)}</span>!
      </h1>
      <p className="mt-2 text-fg-muted">{email}</p>

      {/* ABAS (Item 2 da NEU-83) */}
      <div className="mt-8 border-b border-border mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link
            href={`?tab=desempenho${isDemo ? "&demo=true" : ""}`}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "desempenho"
                ? "border-attention text-attention"
                : "border-transparent text-fg-muted hover:border-border hover:text-fg"
            )}
          >
            Meu Desempenho
          </Link>
          <Link
            href={`?tab=colecao${isDemo ? "&demo=true" : ""}`}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "colecao"
                ? "border-attention text-attention"
                : "border-transparent text-fg-muted hover:border-border hover:text-fg"
            )}
          >
            Coleção
          </Link>
          <Link
            href={`?tab=perfil${isDemo ? "&demo=true" : ""}`}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "perfil"
                ? "border-attention text-attention"
                : "border-transparent text-fg-muted hover:border-border hover:text-fg"
            )}
          >
            Meu Perfil
          </Link>
        </nav>
      </div>

      {activeTab === "desempenho" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {summaries.length === 0 ? (
            <EmptyState email={email} />
          ) : (
            <>
              {/* Card dos Stories (NEU-88): só com corrida real, nunca no demo. */}
              {!showDemo && (
                <ShareCard
                  archetype={buildArchetypeCard({ displayName, races: summaries, leaderboard: [] }) !== null}
                />
              )}
              <DashboardClient races={summaries} demo={showDemo} />
            </>
          )}
        </div>
      ) : activeTab === "colecao" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Coleção (NEU-134): desbloqueios das corridas REAIS (nunca da demo), sem escrita no banco. */}
          <CollectionTab unlocks={computeUnlocks(realSummaries, user.created_at ?? null)} />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
          <div className="glass-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-fg-strong mb-6">
              Informações Públicas
            </h2>
            <DisplayNameForm
              userId={user.id}
              initialName={displayName}
            />
          </div>
        </div>
      )}
    </div>
  );
}