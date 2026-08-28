"use client";

import { useState, useEffect } from "react";
import { StatCard } from "./StatCard";
import { EvolutionChart } from "./EvolutionChart";
import { ReplayChart } from "./ReplayChart";
import {
  formatDuration,
  formatPct,
  formatRaceDate,
  type RaceSummary,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Componentes e Serviços de IA
import { CognitiveFeedbackCard } from "@/components/ai/cognitive-feedback-card";
import { getCognitiveReportAction } from "@/lib/ai/actions/generate-report.action";
import { generateFallbackReport, type CognitiveReportOutput } from "@/lib/ai/schemas/cognitive-report.schema";

export function DashboardClient({ races }: { races: RaceSummary[] }) {
  // `races` chega ordenado por started_at ascendente.
  const [selectedId, setSelectedId] = useState(
    races[races.length - 1]?.racePlayerId,
  );
  const selected =
    races.find((r) => r.racePlayerId === selectedId) ??
    races[races.length - 1];

  // Estado da IA
  const [report, setReport] = useState<CognitiveReportOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // Dispara a IA sempre que a corrida selecionada mudar
  useEffect(() => {
    if (!selected) return;

    let isMounted = true;
    setLoadingAi(true);

    getCognitiveReportAction(selected)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setReport(res.data);
          setIsFallback(!!res.isFallback);
        } else if (isMounted) {
          // Fallback seguro se falhar
          setReport(generateFallbackReport(selected.metrics.avgAttention ?? 50, false));
          setIsFallback(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReport(generateFallbackReport(selected.metrics.avgAttention ?? 50, false));
          setIsFallback(true);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingAi(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId, selected]);

  const raceAverages = races
    .map((r) => r.metrics.avgAttention)
    .filter((v): v is number => v != null);
  const overallAvg = raceAverages.length
    ? raceAverages.reduce((a, b) => a + b, 0) / raceAverages.length
    : null;
  const best = raceAverages.length ? Math.max(...raceAverages) : null;

  const evolution = races.map((r, i) => ({
    label: `#${i + 1}`,
    foco: r.metrics.avgAttention != null ? Math.round(r.metrics.avgAttention) : null,
  }));

  if (!selected) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. Métricas Globais */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Foco médio" value={formatPct(overallAvg)} />
        <StatCard label="Melhor corrida" value={formatPct(best)} />
        <StatCard label="Corridas" value={String(races.length)} />
      </div>

      <p className="text-xs leading-relaxed text-fg-muted">
        Métricas derivadas da telemetria de atenção (attention) do sensor. As
        definições oficiais ainda serão alinhadas com o backend — os valores
        podem mudar quando o cálculo padrão for publicado.
      </p>

      {/* 2. Gráfico de Evolução Geral */}
      <Card title="📈 Evolução do foco (por corrida)">
        <EvolutionChart data={evolution} />
      </Card>

      {/* 3. Seção do Replay + Lista Lateral de Corridas */}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card title={`🧠 Replay — ${formatRaceDate(selected.startedAt)}`}>
          <ReplayChart series={selected.series} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Mini label="Pico" value={formatPct(selected.metrics.peakAttention)} />
            <Mini label="Média" value={formatPct(selected.metrics.avgAttention)} />
            <Mini
              label="Tempo em foco"
              value={formatPct(selected.metrics.focusZonePct)}
            />
            <Mini
              label="Duração"
              value={formatDuration(selected.metrics.durationSeconds)}
            />
          </div>
          {selected.metrics.sampleCount === 0 && (
            <p className="mt-3 text-center text-xs text-fg-muted">
              Sem amostras de telemetria para esta corrida.
            </p>
          )}
        </Card>

        <Card title="📊 Suas corridas">
          <ul className="max-h-80 space-y-2 overflow-auto pr-1">
            {races
              .map((r, i) => ({ r, num: i + 1 }))
              .reverse()
              .map(({ r, num }) => {
                const active = r.racePlayerId === selected.racePlayerId;
                return (
                  <li key={r.racePlayerId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.racePlayerId)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                        active
                          ? "border-cyan bg-card"
                          : "border-border hover:border-fg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-fg-strong">
                          Corrida {num}
                        </span>
                        <span className="text-sm text-cyan">
                          {formatPct(r.metrics.avgAttention)}
                        </span>
                      </div>
                      <div className="text-xs text-fg-muted">
                        {formatRaceDate(r.startedAt)}
                      </div>
                    </button>
                  </li>
                );
              })}
          </ul>
        </Card>
      </div>

      {/* 4. SEÇÃO DO NEUROCOACH AI (LARGURA TOTAL) */}
      <section className="pt-2">
        {loadingAi ? (
          <div className="rounded-2xl border border-border bg-card/30 p-8 text-center animate-pulse text-fg-muted">
            <span className="text-xl inline-block mb-2">🧠</span>
            <p className="text-sm font-medium text-fg-strong">
              O NeuroCoach está analisando o padrão neurocognitivo desta corrida...
            </p>
          </div>
        ) : report ? (
          <CognitiveFeedbackCard report={report} isFallback={isFallback} />
        ) : null}
      </section>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-card/40 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-fg-strong">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 px-2 py-3">
      <div className="font-display text-lg font-bold text-fg-strong">
        {value}
      </div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}