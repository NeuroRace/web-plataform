import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  LeaderboardTable,
  type LeaderboardRow,
} from "@/components/ranking/LeaderboardTable";

const rows: LeaderboardRow[] = [
  { rank: 1, display_name: "PedroT", score: 29 },
  { rank: 2, display_name: "Breq", score: 31 },
  { rank: 3, display_name: "EsterS", score: 34 },
];

describe("LeaderboardTable", () => {
  it("renderiza uma linha por jogador, com posição, nome e tempo", () => {
    render(<LeaderboardTable rows={rows} />);
    // +1 pela linha de cabeçalho
    expect(screen.getAllByRole("row")).toHaveLength(rows.length + 1);

    const linha = screen.getByRole("row", { name: /PedroT/ });
    expect(within(linha).getByText("1")).toBeInTheDocument();
    expect(within(linha).getByText("29s")).toBeInTheDocument();
  });

  it("marca a linha do próprio usuário com aria-current", () => {
    render(<LeaderboardTable rows={rows} highlight="Breq" />);
    const minha = screen.getByRole("row", { current: true });
    expect(within(minha).getByText("Breq")).toBeInTheDocument();
  });

  it("compara o apelido sem diferenciar maiúsculas (display_name é citext)", () => {
    render(<LeaderboardTable rows={rows} highlight="bREQ" />);
    const minha = screen.getByRole("row", { current: true });
    expect(within(minha).getByText("Breq")).toBeInTheDocument();
  });

  it("sem apelido (deslogado ou sem nome definido) não destaca ninguém", () => {
    render(<LeaderboardTable rows={rows} highlight={null} />);
    expect(screen.queryByRole("row", { current: true })).not.toBeInTheDocument();
  });

  it("respeita empates: rank() da função repete a posição e pula a seguinte", () => {
    // get_leaderboard usa rank() com gap — dois em 30s são ambos 1, o próximo é 3.
    const comEmpate: LeaderboardRow[] = [
      { rank: 1, display_name: "Bob", score: 30 },
      { rank: 1, display_name: "Dave", score: 30 },
      { rank: 3, display_name: "Alice", score: 60 },
    ];
    render(<LeaderboardTable rows={comEmpate} />);

    expect(
      within(screen.getByRole("row", { name: /Bob/ })).getByText("1"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("row", { name: /Dave/ })).getByText("1"),
    ).toBeInTheDocument();
    // Alice é 3, não 2 — a UI não pode renumerar por índice.
    expect(
      within(screen.getByRole("row", { name: /Alice/ })).getByText("3"),
    ).toBeInTheDocument();
  });

  it("formata score fracionado como duração (score é numeric no banco)", () => {
    render(
      <LeaderboardTable
        rows={[{ rank: 1, display_name: "Fracao", score: 119.7 }]}
      />,
    );
    // NEU-72: 119.7 é 2m00s, não "1m60s".
    expect(screen.getByText("2m00s")).toBeInTheDocument();
  });
});
