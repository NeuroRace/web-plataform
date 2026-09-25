import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/Footer";

describe("Footer (NEU-103)", () => {
  it("tem link para a política de privacidade", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /política de privacidade/i })).toHaveAttribute(
      "href",
      "/privacidade",
    );
  });

  it("não promete mais que os dados servem só para a entrega de prêmios", () => {
    render(<Footer />);
    expect(screen.queryByText(/entrega dos prêmios/i)).toBeNull();
  });
});
