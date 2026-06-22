import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionLabel } from "@/components/signal/SectionLabel";

describe("SectionLabel", () => {
  it("prefixa índice numérico com dois dígitos", () => {
    render(<SectionLabel index={2}>O Conceito</SectionLabel>);
    expect(screen.getByText(/02 —/)).toBeInTheDocument();
    expect(screen.getByText(/O Conceito/)).toBeInTheDocument();
  });

  it("sem índice não renderiza prefixo", () => {
    render(<SectionLabel>Sinal</SectionLabel>);
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });
});
