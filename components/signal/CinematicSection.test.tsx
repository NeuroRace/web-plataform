import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CinematicSection } from "@/components/signal/CinematicSection";

describe("CinematicSection", () => {
  it("mostra contador NN / TT, o label e os filhos", () => {
    render(
      <CinematicSection index={2} label="O Cenário">
        <p>conteúdo da cena</p>
      </CinematicSection>,
    );
    expect(screen.getByText("02 / 06")).toBeInTheDocument();
    expect(screen.getByText(/O Cenário/i)).toBeInTheDocument();
    expect(screen.getByText("conteúdo da cena")).toBeInTheDocument();
  });

  it("renderiza o background quando fornecido", () => {
    render(
      <CinematicSection index={1} label="Abertura" background={<div data-testid="bg" />}>
        <p>oi</p>
      </CinematicSection>,
    );
    expect(screen.getByTestId("bg")).toBeInTheDocument();
  });
});
