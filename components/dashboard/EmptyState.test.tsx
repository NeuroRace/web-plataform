import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// No vitest o import estático de .png não traz width/height; o next/image exige.
vi.mock("@/public/assets/images/mascot-running.png", () => ({
  default: { src: "/mascot-running.png", width: 256, height: 256 },
}));

import { EmptyState } from "@/components/dashboard/EmptyState";

// NEU-175: com o login sem senha não há cadastro separado nem confirmação de
// e-mail, e a pessoa pode ter jogado com o celular.
describe("EmptyState", () => {
  it("passo a passo atual, sem cadastro nem confirmação de e-mail", () => {
    render(<EmptyState contact="breq@exemplo.com" />);
    expect(screen.getByText(/mesmo e-mail ou celular/)).toBeInTheDocument();
    expect(screen.queryByText(/cadastre-se/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirme o e-mail/i)).not.toBeInTheDocument();
  });

  it("com e-mail: mostra com que e-mail a pessoa entrou", () => {
    render(<EmptyState contact="breq@exemplo.com" />);
    expect(screen.getByText("breq@exemplo.com")).toBeInTheDocument();
  });

  it("só com celular: mostra o celular mascarado", () => {
    render(<EmptyState contact="+55 11 9••••-4321" />);
    expect(screen.getByText("+55 11 9••••-4321")).toBeInTheDocument();
  });

  it("sem contato: não deixa parênteses nem frase vazia", () => {
    render(<EmptyState contact="" />);
    expect(screen.queryByText(/Você entrou com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(\)/)).not.toBeInTheDocument();
  });
});
