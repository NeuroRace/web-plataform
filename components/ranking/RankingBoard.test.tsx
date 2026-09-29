import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { RankingSnapshot } from "@/lib/ranking-data";
import type { RankingWindow } from "@/lib/ranking";

const loadRanking = vi.fn();
vi.mock("@/lib/ranking-data", () => ({
  loadRanking: (...args: unknown[]) => loadRanking(...args),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
// No vitest o import estático de .png não traz width/height; o next/image exige.
vi.mock("@/public/assets/images/mascot-winner.png", () => ({
  default: { src: "/mascot-winner.png", width: 256, height: 256 },
}));

import { RankingBoard } from "./RankingBoard";

const rodada2: RankingWindow = {
  id: "2",
  name: "Rodada 2",
  starts_at: "2026-09-30T12:00:00-03:00",
  ends_at: "2026-09-30T14:00:00-03:00",
};
const rodada1: RankingWindow = {
  id: "1",
  name: "Rodada 1",
  starts_at: "2026-09-30T10:00:00-03:00",
  ends_at: "2026-09-30T12:00:00-03:00",
};

const semRodadas: RankingSnapshot = {
  windows: null,
  event: { rows: [{ rank: 1, display_name: "PedroT", score: 29 }], error: false },
  round: null,
  previousWinner: null,
  failed: false,
  fetchedAt: "2026-09-30T15:30:00.000Z",
};

const comRodada: RankingSnapshot = {
  windows: { eventStart: rodada1.starts_at, current: rodada2, previous: rodada1 },
  event: {
    rows: [
      { rank: 1, display_name: "PedroT", score: 29 },
      { rank: 2, display_name: "Breq", score: 31 },
    ],
    error: false,
  },
  round: { rows: [{ rank: 1, display_name: "Breq", score: 31 }], error: false },
  previousWinner: { rank: 1, display_name: "PedroT", score: 29 },
  failed: false,
  fetchedAt: "2026-09-30T15:30:00.000Z",
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date("2026-09-30T12:30:00-03:00"));
  loadRanking.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RankingBoard", () => {
  it("sem rodadas cadastradas: sem abas, mostra o ranking do evento", () => {
    render(<RankingBoard initial={semRodadas} />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("PedroT")).toBeInTheDocument();
  });

  it("com rodada em andamento: abre na aba Rodada atual, com nome, horário e quanto falta", async () => {
    render(<RankingBoard initial={comRodada} />);
    expect(screen.getByRole("tab", { name: "Rodada atual" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Rodada 2" })).toBeInTheDocument();
    expect(screen.getByText("12:00–14:00")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("faltam 1h 30min")).toBeInTheDocument();
  });

  it("mostra o vencedor da rodada anterior", () => {
    render(<RankingBoard initial={comRodada} />);
    expect(screen.getByText(/Vencedor da Rodada 1/)).toHaveTextContent("PedroT");
  });

  it("troca para a aba Evento ao clicar", () => {
    render(<RankingBoard initial={comRodada} />);
    fireEvent.click(screen.getByRole("tab", { name: "Evento" }));
    expect(screen.getByRole("tab", { name: "Evento" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("row")).toHaveLength(3); // cabeçalho + 2
  });

  it("rodada sem corridas: estado vazio honesto", () => {
    render(
      <RankingBoard initial={{ ...comRodada, round: { rows: [], error: false } }} />,
    );
    expect(screen.getByText("A rodada começou!")).toBeInTheDocument();
  });

  it("atualiza sozinho a cada 15 s: corrida nova aparece sem recarregar", async () => {
    loadRanking.mockResolvedValue({
      ...comRodada,
      round: {
        rows: [
          { rank: 1, display_name: "EsterS", score: 27 },
          { rank: 2, display_name: "Breq", score: 31 },
        ],
        error: false,
      },
    });
    render(<RankingBoard initial={comRodada} />);
    expect(screen.queryByText("EsterS")).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(loadRanking).toHaveBeenCalledTimes(1);
    expect(screen.getByText("EsterS")).toBeInTheDocument();
  });

  it("falha na atualização: mantém os últimos dados e avisa", async () => {
    loadRanking.mockResolvedValue({
      ...semRodadas,
      event: { rows: [], error: true },
      failed: true,
    });
    render(<RankingBoard initial={semRodadas} />);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByText("PedroT")).toBeInTheDocument();
    expect(screen.getByText(/Sem conexão com o ranking/)).toBeInTheDocument();
  });

  it("falha só na rodada: mantém abas, rodada e lista, e avisa", async () => {
    loadRanking.mockResolvedValue({
      ...comRodada,
      round: { rows: [], error: true },
      failed: true,
    });
    render(<RankingBoard initial={comRodada} />);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByRole("tab", { name: "Rodada atual" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Rodada 2" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Breq/ })).toBeInTheDocument();
    expect(screen.getByText(/Sem conexão com o ranking/)).toBeInTheDocument();
  });

  it("busca de rodadas fora do ar (snapshot sem rodadas e falho): não troca a tela", async () => {
    loadRanking.mockResolvedValue({ ...semRodadas, failed: true });
    render(<RankingBoard initial={comRodada} />);

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText(/Vencedor da Rodada 1/)).toBeInTheDocument();
    expect(screen.getByText(/Sem conexão com o ranking/)).toBeInTheDocument();
  });

  it("snapshot inicial falho: já abre avisando", () => {
    render(<RankingBoard initial={{ ...semRodadas, failed: true }} />);
    expect(screen.getByText(/Sem conexão com o ranking/)).toBeInTheDocument();
  });

  it("modo telão: pede só o top 10 e não destaca o usuário logado", async () => {
    loadRanking.mockResolvedValue(comRodada);
    render(<RankingBoard initial={comRodada} mode="telao" highlight="Breq" />);
    expect(screen.queryByRole("row", { current: true })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tela cheia" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    expect(loadRanking).toHaveBeenCalledWith(expect.anything(), expect.any(Date), { limit: 10 });
  });
});
