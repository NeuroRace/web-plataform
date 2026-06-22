import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Readout } from "@/components/signal/Readout";

describe("Readout", () => {
  it("mostra rótulo e valor", () => {
    render(<Readout label="Atenção" value="0.78" kind="attention" />);
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("0.78")).toBeInTheDocument();
  });

  it("aplica a cor semântica de meditação", () => {
    render(<Readout label="Meditação" value="0.41" kind="meditation" />);
    expect(screen.getByText("0.41")).toHaveClass("text-meditation");
  });
});
