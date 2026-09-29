import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEMO_RACE } from "@/lib/coach/demo";

// Gráficos não interessam aqui (e o recharts precisa de layout real).
vi.mock("./EvolutionChart", () => ({ EvolutionChart: () => null }));
vi.mock("./ReplayChart", () => ({ ReplayChart: () => null }));
// Sem servidor: o NeuroCoach remoto fica "analisando".
vi.mock("@/components/coach/useCoachReport", () => ({
  useCoachReport: () => ({ result: null, retry: () => {} }),
}));

import { DashboardClient } from "./DashboardClient";

const AVISO = /O texto escrito por IA só é gerado com a sua autorização/;

describe("DashboardClient — NeuroCoach e consentimento (NEU-103)", () => {
  it("sem consentimento: o NeuroCoach continua na tela, com o aviso da autorização", () => {
    render(<DashboardClient races={[DEMO_RACE]} coachEnabled={false} />);
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(screen.getByText("O NeuroCoach está analisando esta corrida…")).toBeInTheDocument();
  });

  it("com consentimento: sem aviso", () => {
    render(<DashboardClient races={[DEMO_RACE]} coachEnabled />);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(screen.getByText("O NeuroCoach está analisando esta corrida…")).toBeInTheDocument();
  });

  it("demo (?demo=true): análise local, sem aviso de autorização", () => {
    render(<DashboardClient races={[DEMO_RACE]} demo />);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
    expect(screen.queryByText("O NeuroCoach está analisando esta corrida…")).not.toBeInTheDocument();
  });
});
