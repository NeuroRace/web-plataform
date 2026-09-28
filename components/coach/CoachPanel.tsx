import { CoachCard } from "./CoachCard";
import type { CoachActionResult } from "@/lib/coach/types";

export function CoachPanel({ result }: { result: CoachActionResult | null }) {
  if (result === null) {
    return (
      <div className="animate-pulse rounded-card border border-border bg-card/30 p-8 text-center text-sm text-fg-muted">
        O NeuroCoach está analisando esta corrida…
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="rounded-card border border-border bg-card/30 p-6 text-center text-sm text-fg-muted">
        {result.reason === "unauthenticated"
          ? "Sua sessão expirou. Entre de novo para ver a análise do NeuroCoach."
          : "Não foi possível analisar esta corrida agora. Tente de novo em instantes."}
      </div>
    );
  }
  return <CoachCard facts={result.facts} narrative={result.narrative} />;
}
