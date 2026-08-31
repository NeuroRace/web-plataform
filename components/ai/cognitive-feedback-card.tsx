import React from "react";
import type { CognitiveReportOutput } from "@/lib/ai/types";
import { ArchetypeBadge } from "./archetype-badge";
import { BadgesGrid } from "./badges-grid";

interface CognitiveFeedbackCardProps {
  report: CognitiveReportOutput;
  isFallback?: boolean;
}

export function CognitiveFeedbackCard({ report, isFallback }: CognitiveFeedbackCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-950/70 border border-zinc-800/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
      {/* Luz ambiente de fundo (Glow) */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      {/* Header do Card */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-cyan-400">
              NeuroCoach AI Telemetry
            </span>
            {isFallback && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                Modo Heurístico
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {report.headline}
          </h2>
        </div>

        <ArchetypeBadge archetype={report.archetype} />
      </div>

      {/* Narrativa da Prova */}
      <div className="relative z-10 py-6 border-b border-zinc-800/80">
        <p className="text-sm md:text-base leading-relaxed text-zinc-300">
          {report.narrative_summary}
        </p>
      </div>

      {/* Grid: Pontos Fortes e Oportunidades */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-zinc-800/80">
        {/* Forças */}
        <div className="rounded-xl bg-zinc-900/40 border border-emerald-500/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Forças Cognitivas Demonstradas
          </h3>
          <ul className="space-y-2">
            {report.mental_strengths.map((item, idx) => (
              <li key={idx} className="text-xs md:text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Oportunidades */}
        <div className="rounded-xl bg-zinc-900/40 border border-amber-500/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Oportunidades de Evolução
          </h3>
          <ul className="space-y-2">
            {report.areas_for_improvement.map((item, idx) => (
              <li key={idx} className="text-xs md:text-sm text-zinc-300 flex items-start gap-2">
                <span className="text-amber-400 font-bold">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Treinos Práticos (Biofeedback Drills) & Badges */}
      <div className="relative z-10 pt-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        {/* Exercício */}
        <div className="flex-1">
          {report.actionable_drills.map((drill, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="text-xl">🫁</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-400">{drill.title}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {drill.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{drill.instruction}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div>
          <BadgesGrid badges={report.badges_unlocked} />
        </div>
      </div>
    </div>
  );
}