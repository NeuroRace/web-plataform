import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveSignal } from "@/components/signal/LiveSignal";

describe("LiveSignal", () => {
  it("modo demo mostra o rótulo de demonstração (honestidade de dado)", () => {
    render(<LiveSignal mode="demo" />);
    expect(screen.getByText(/demonstração/i)).toBeInTheDocument();
  });

  it("modo data NÃO mostra rótulo de demonstração", () => {
    render(
      <LiveSignal
        mode="data"
        series={[
          { t: 0, attention: 50, meditation: 40 },
          { t: 1, attention: 70, meditation: 35 },
        ]}
      />,
    );
    expect(screen.queryByText(/demonstração/i)).not.toBeInTheDocument();
  });

  it("desenha a zona de foco", () => {
    render(<LiveSignal mode="demo" />);
    expect(screen.getByText(/Zona de foco/i)).toBeInTheDocument();
  });
});
