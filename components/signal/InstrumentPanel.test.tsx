import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InstrumentPanel } from "@/components/signal/InstrumentPanel";

describe("InstrumentPanel", () => {
  it("mostra header 'Ao vivo' quando live", () => {
    render(
      <InstrumentPanel title="Sinal" live>
        <p>conteúdo</p>
      </InstrumentPanel>,
    );
    expect(screen.getByText(/Ao vivo/i)).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("sem title/live não renderiza header", () => {
    render(
      <InstrumentPanel>
        <p>só corpo</p>
      </InstrumentPanel>,
    );
    expect(screen.queryByText(/Ao vivo/i)).not.toBeInTheDocument();
  });
});
