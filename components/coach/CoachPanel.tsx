import { CoachCard } from "./CoachCard";
import type { CoachActionResult } from "@/lib/coach/types";

export function CoachPanel({ result, onRetry }: { result: CoachActionResult | null; onRetry?: () => void }) {
  if (result === null) {
    return (
      <div
        role="status"
        className="animate-pulse rounded-card border border-border bg-card/30 p-8 text-center text-sm text-fg-muted"
      >
        O NeuroCoach está analisando esta corrida…
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="rounded-card border border-border bg-card/30 p-6 text-center text-sm text-fg-muted">
        {result.reason === "unauthenticated" ? (
          "Sua sessão expirou. Entre de novo para ver a análise do NeuroCoach."
        ) : (
          <>
            <p>Não foi possível analisar esta corrida agora.</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-cyan/40 px-3 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/10"
              >
                Tentar de novo
              </button>
            )}
          </>
        )}
      </div>
    );
  }
  return <CoachCard facts={result.facts} narrative={result.narrative} />;
}
