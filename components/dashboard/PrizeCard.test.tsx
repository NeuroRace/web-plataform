import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PrizeCard } from "@/components/dashboard/PrizeCard";
import { loadMyPrize } from "@/lib/prize-data";
import { PRIZE_REFRESH_MS, type PrizeRow } from "@/lib/prize";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/lib/prize-data", () => ({ loadMyPrize: vi.fn() }));

const OPEN: PrizeRow = {
  round_name: "Rodada 2",
  status: "avisado",
  code: "482913",
  claim_deadline: "2026-10-24T18:20:00Z", // 15:20 em São Paulo
  delivered_at: null,
};
const DELIVERED: PrizeRow = { ...OPEN, status: "entregue", delivered_at: "2026-10-24T18:31:00Z" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T18:10:00Z"));
  vi.mocked(loadMyPrize).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PrizeCard", () => {
  it("janela aberta: rodada, código e hora limite", () => {
    render(<PrizeCard initial={OPEN} />);
    expect(screen.getByRole("heading", { name: "Você venceu a Rodada 2!" })).toBeInTheDocument();
    expect(screen.getByText("482913")).toBeInTheDocument();
    expect(screen.getByText(/até 15:20/)).toBeInTheDocument();
  });

  it("retirado: hora da retirada e nenhum código", () => {
    render(<PrizeCard initial={DELIVERED} />);
    expect(screen.getByText(/retirado às 15:31/)).toBeInTheDocument();
    expect(screen.queryByText("482913")).not.toBeInTheDocument();
  });

  it("passou: avisa sem mostrar o código", () => {
    render(<PrizeCard initial={{ ...OPEN, status: "recusado" }} />);
    expect(screen.getByText(/passou para o próximo colocado/)).toBeInTheDocument();
    expect(screen.queryByText("482913")).not.toBeInTheDocument();
  });

  it("sem prêmio: nada aparece, o painel fica como hoje", () => {
    const { container } = render(<PrizeCard initial={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("prazo estourado: mantém o código e diz que ainda dá para ir ao estande", () => {
    render(<PrizeCard initial={{ ...OPEN, status: "prazo_estourou" }} />);
    expect(screen.getByText("482913")).toBeInTheDocument();
    expect(screen.getByText(/O prazo era 15:20/)).toBeInTheDocument();
  });

  it("com a janela aberta, busca de novo a cada 30 s e mostra a retirada", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue([DELIVERED]);
    render(<PrizeCard initial={OPEN} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIZE_REFRESH_MS);
    });
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/retirado às 15:31/)).toBeInTheDocument();
  });

  it("busca que falha mantém o que já estava na tela", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue(null);
    render(<PrizeCard initial={OPEN} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIZE_REFRESH_MS);
    });
    expect(screen.getByText("482913")).toBeInTheDocument();
  });

  it("sem código valendo, não fica buscando", async () => {
    render(<PrizeCard initial={DELIVERED} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIZE_REFRESH_MS * 3);
    });
    expect(loadMyPrize).not.toHaveBeenCalled();
  });
});
