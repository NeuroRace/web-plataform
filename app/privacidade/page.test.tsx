import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacidadePage from "@/app/privacidade/page";

// Os compromissos do termo v1 (ADR 0003) têm de continuar escritos na política.
describe("/privacidade (NEU-103)", () => {
  it("traz responsável e contato do titular", () => {
    render(<PrivacidadePage />);
    expect(screen.getByText(/Equipe NeuroRace/)).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "breq@breq.com.br" });
    expect(links[0]).toHaveAttribute("href", "mailto:breq@breq.com.br");
  });

  it("declara base legal, retenção de 90 dias e o provedor de IA", () => {
    const { container } = render(<PrivacidadePage />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/art\. 11, I/);
    expect(text).toMatch(/90 dias após a corrida/);
    expect(text).toMatch(/Groq/);
    expect(text).toMatch(/sem nome, e-mail nem data/);
  });

  it("diz que a câmera não grava imagem e que menores correm sem e-mail", () => {
    const { container } = render(<PrivacidadePage />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/Nenhuma imagem é gravada/);
    expect(text).toMatch(/Menores de 18 anos correm sempre sem e-mail/);
  });
});
