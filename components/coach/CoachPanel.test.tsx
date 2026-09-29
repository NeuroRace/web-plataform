import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoachPanel } from "@/components/coach/CoachPanel";
import { analyzeRace } from "@/lib/coach/analyze";
import { flat, makeRace } from "@/lib/coach/test-utils";

describe("CoachPanel", () => {
  it("carregando", () => {
    render(<CoachPanel result={null} />);
    expect(screen.getByText(/analisando esta corrida/i)).toBeInTheDocument();
  });
  it("sessão expirada", () => {
    render(<CoachPanel result={{ ok: false, reason: "unauthenticated" }} />);
    expect(screen.getByText(/sessão expirou/i)).toBeInTheDocument();
  });
  it.each(["not_found", "error"] as const)("%s", (reason) => {
    render(<CoachPanel result={{ ok: false, reason }} />);
    expect(screen.getByText(/não foi possível analisar/i)).toBeInTheDocument();
  });
  it("erro oferece 'Tentar de novo'", async () => {
    const onRetry = vi.fn();
    render(<CoachPanel result={{ ok: false, reason: "error" }} onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /tentar de novo/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("carregando é anunciado para leitor de tela", () => {
    render(<CoachPanel result={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/analisando/i);
  });
  it("relatório", () => {
    const race = makeRace(flat(70, 20));
    render(
      <CoachPanel
        result={{
          ok: true,
          facts: analyzeRace(race, [race]),
          narrative: { headline: "Manchete do painel", summary: "Resumo.", source: "template" },
        }}
      />,
    );
    expect(screen.getByText("Manchete do painel")).toBeInTheDocument();
  });
});
