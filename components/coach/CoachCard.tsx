import { describeGoal, describeMoment, formatDecimal, MOMENT_SYMBOLS } from "@/lib/coach/describe";
import { ARCHETYPE_INFO, BADGE_INFO } from "@/lib/coach/rules";
import type { CoachFacts, CoachNarrative } from "@/lib/coach/types";

function signed(v: number): string {
  return `${v > 0 ? "+" : ""}${formatDecimal(v)}`;
}

/** Chip de evolução: ▲ = melhorou, ▼ = piorou. Para o tempo, menor é melhor. */
function DeltaChip({ value, unit, lowerIsBetter }: { value: number; unit: "pts" | "s"; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? value < 0 : value > 0;
  const same = value === 0;
  const what = unit === "pts" ? "foco" : "tempo";
  const label = unit === "pts" ? `${signed(value)} pts de foco` : `${signed(value)} s no tempo`;
  const amount = `${formatDecimal(Math.abs(value))} ${unit === "pts" ? "pontos" : "segundos"}`;
  return (
    <span
      aria-label={same ? `${what}: igual` : `${what}: ${improved ? "melhorou" : "piorou"} ${amount}`}
      className={`rounded-md border px-2 py-0.5 ${
        same ? "border-border text-fg-strong" : improved ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
      }`}
    >
      {same ? label : `${label} ${improved ? "▲" : "▼"}`}
    </span>
  );
}

export function CoachCard({ facts, narrative }: { facts: CoachFacts; narrative: CoachNarrative }) {
  const prev = facts.progress.previous;
  return (
    <section className="glass-card p-5 sm:p-6" aria-label="NeuroCoach">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan">NeuroCoach</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-fg-strong">{narrative.headline}</h2>
        </div>
        {facts.archetype && (
          <span
            title={ARCHETYPE_INFO[facts.archetype].description}
            className="rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan"
          >
            {ARCHETYPE_INFO[facts.archetype].label}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{narrative.summary}</p>
      <p className="mt-1 text-xs text-fg-muted">
        {narrative.source === "ai"
          ? "Texto gerado por IA a partir dos seus dados"
          : "Resumo automático a partir dos seus dados"}
      </p>

      {facts.moments.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Momentos da corrida</h3>
          <ol className="mt-2 space-y-1.5">
            {facts.moments.map((m, i) => (
              <li key={`${m.kind}-${m.t}`} className="flex items-start gap-2 text-sm text-fg">
                <span className="text-cyan">{MOMENT_SYMBOLS[i]}</span>
                <span>{describeMoment(m)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {prev && (prev.attentionDelta !== null || prev.durationDelta !== null) && (
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="text-fg-muted">vs corrida anterior:</span>
          {prev.attentionDelta !== null && <DeltaChip value={prev.attentionDelta} unit="pts" />}
          {prev.durationDelta !== null && <DeltaChip value={prev.durationDelta} unit="s" lowerIsBetter />}
        </div>
      )}

      {facts.badges.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {facts.badges.map((b) => (
            <li
              key={b}
              title={BADGE_INFO[b].description}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg/60 px-2.5 py-1 text-xs text-fg-strong"
            >
              <span aria-hidden>{BADGE_INFO[b].icon}</span>
              <span>{BADGE_INFO[b].label}</span>
            </li>
          ))}
        </ul>
      )}

      {facts.goal && (
        <div className="mt-5 rounded-lg border border-cyan/30 bg-cyan/5 p-4">
          <p className="text-sm font-semibold text-fg-strong">🎯 Próxima corrida: {describeGoal(facts.goal)}</p>
          <p className="mt-1 text-sm text-fg">
            <span className="font-medium text-cyan">{facts.goal.drill.title}:</span> {facts.goal.drill.steps}
          </p>
        </div>
      )}
    </section>
  );
}
