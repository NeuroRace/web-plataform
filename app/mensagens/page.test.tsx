import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MensagensPage, { metadata } from "@/app/mensagens/page";

describe("/mensagens", () => {
  it("t repetido na URL (array) vira link invalido, sem botao", async () => {
    render(await MensagensPage({ searchParams: Promise.resolve({ t: ["a.b", "c.d"] }) }));
    expect(screen.getByRole("heading", { name: /link inválido/i })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("nao indexa e nao manda o link (com o token) como Referer", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
