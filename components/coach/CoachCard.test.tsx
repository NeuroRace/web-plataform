import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachCard } from "@/components/coach/CoachCard";
import { analyzeRace } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];

describe("CoachCard", () => {
  it("mostra arquétipo, texto, momentos, badges e meta", () => {
    const race = makeRace(M);
    render(
      <CoachCard
        facts={analyzeRace(race, [race])}
        narrative={{ headline: "Manchete da IA", summary: "Resumo gerado.", source: "ai" }}
      />,
    );
    expect(screen.getByText("Manchete da IA")).toBeInTheDocument();
    expect(screen.getByText("Oscilador")).toBeInTheDocument();
    expect(screen.getByText(/texto gerado por IA/i)).toBeInTheDocument();
    expect(screen.getByText("0:08–0:17 · 10 s seguidos em foco alto")).toBeInTheDocument();
    expect(screen.getByText("①")).toBeInTheDocument();
    expect(screen.getByText("Virada Mental")).toBeInTheDocument();
    expect(screen.getByText(/Próxima corrida/i)).toBeInTheDocument();
  });

  it("evolução em relação à corrida anterior", () => {
    const r1 = makeRace(flat(50, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z", durationSeconds: 70 });
    const r2 = makeRace(flat(60, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z", durationSeconds: 60 });
    render(
      <CoachCard
        facts={analyzeRace(r2, [r1, r2])}
        narrative={{ headline: "Manchete longa ok", summary: "Resumo.", source: "template" }}
      />,
    );
    // Mais foco e menos tempo = melhorou (▲) nos dois.
    expect(screen.getByText("+10 pts de foco ▲")).toBeInTheDocument();
    expect(screen.getByText("-10 s no tempo ▲")).toBeInTheDocument();
    expect(screen.getByText(/resumo automático/i)).toBeInTheDocument();
  });

  it("evolução para pior aparece com ▼", () => {
    const r1 = makeRace(flat(60, 20), { id: "r1", startedAt: "2026-09-30T17:00:00.000Z", durationSeconds: 60 });
    const r2 = makeRace(flat(55, 20), { id: "r2", startedAt: "2026-09-30T17:10:00.000Z", durationSeconds: 65 });
    render(
      <CoachCard
        facts={analyzeRace(r2, [r1, r2])}
        narrative={{ headline: "Manchete longa ok", summary: "Resumo.", source: "template" }}
      />,
    );
    expect(screen.getByText("-5 pts de foco ▼")).toHaveAttribute("aria-label", "foco: piorou 5 pontos");
    expect(screen.getByText("+5 s no tempo ▼")).toHaveAttribute("aria-label", "tempo: piorou 5 segundos");
  });

  it("poucos dados: sem arquétipo, momentos nem meta", () => {
    const race = makeRace(flat(60, 5));
    render(
      <CoachCard
        facts={analyzeRace(race, [race])}
        narrative={{ headline: "Corrida com poucos dados do sensor", summary: "x", source: "template" }}
      />,
    );
    expect(screen.queryByText(/Momentos da corrida/i)).toBeNull();
    expect(screen.queryByText(/Próxima corrida/i)).toBeNull();
  });
});
