import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PrizeCard } from "@/components/dashboard/PrizeCard";
import { loadMyPrize } from "@/lib/prize-data";
import { PRIZE_IDLE_REFRESH_MS, PRIZE_REFRESH_MS, type PrizeRow } from "@/lib/prize";

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

const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const showTab = () =>
  act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

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
    render(<PrizeCard initial={[OPEN]} enabled />);
    expect(screen.getByRole("heading", { name: "Você venceu a Rodada 2!" })).toBeInTheDocument();
    expect(screen.getByText("482913")).toBeInTheDocument();
    expect(screen.getByText(/até 15:20/)).toBeInTheDocument();
  });

  it("leitor de tela lê o código dígito a dígito, não como número", () => {
    render(<PrizeCard initial={[OPEN]} enabled />);
    expect(screen.getByText("482913")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("4 8 2 9 1 3")).toBeInTheDocument();
  });

  it("dois códigos valendo: mostra os dois", () => {
    const r1 = { ...OPEN, round_name: "Rodada 1", status: "aviso_falhou", code: "222222" };
    render(<PrizeCard initial={[OPEN, r1]} enabled />);
    expect(screen.getByText("482913")).toBeInTheDocument();
    expect(screen.getByText("222222")).toBeInTheDocument();
  });

  it("retirado: hora da retirada e nenhum código", () => {
    render(<PrizeCard initial={[DELIVERED]} enabled />);
    expect(screen.getByText(/retirado às 15:31/)).toBeInTheDocument();
    expect(screen.queryByText("482913")).not.toBeInTheDocument();
  });

  it("passou: avisa sem mostrar o código", () => {
    render(<PrizeCard initial={[{ ...OPEN, status: "passou" }]} enabled />);
    expect(screen.getByText(/passou para o próximo colocado/)).toBeInTheDocument();
    expect(screen.queryByText("482913")).not.toBeInTheDocument();
  });

  it("sem prêmio: nada aparece, mas a região de aviso já existe para o leitor de tela", () => {
    // Região inserida junto com o conteúdo não é anunciada; ela precisa estar lá antes.
    const { container } = render(<PrizeCard initial={[]} enabled />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeInTheDocument();
    expect(live).toBeEmptyDOMElement();
  });

  it("prazo estourado: mantém o código e diz que ainda dá para ir ao estande", () => {
    render(<PrizeCard initial={[{ ...OPEN, status: "prazo_estourou" }]} enabled />);
    expect(screen.getByText("482913")).toBeInTheDocument();
    expect(screen.getByText(/O prazo era 15:20/)).toBeInTheDocument();
  });

  it("com a janela aberta, busca de novo a cada 30 s e mostra a retirada", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: true, rows: [DELIVERED] });
    render(<PrizeCard initial={[OPEN]} enabled />);
    await advance(PRIZE_REFRESH_MS);
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/retirado às 15:31/)).toBeInTheDocument();
  });

  it("busca que falha mantém o que já estava na tela", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: false, missing: false });
    render(<PrizeCard initial={[OPEN]} enabled />);
    await advance(PRIZE_REFRESH_MS);
    expect(screen.getByText("482913")).toBeInTheDocument();
  });

  it("exceção na busca não escapa como promessa rejeitada e mantém a tela", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadMyPrize).mockRejectedValue(new Error("rede caiu"));
    render(<PrizeCard initial={[OPEN]} enabled />);
    await advance(PRIZE_REFRESH_MS);
    expect(screen.getByText("482913")).toBeInTheDocument();
  });

  // Fluxo do estande: a pessoa corre, abre o painel, e a rodada só fecha minutos depois.
  it("sem prêmio, busca devagar e mostra o código quando a rodada fecha", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: true, rows: [OPEN] });
    render(<PrizeCard initial={[]} enabled />);
    await advance(PRIZE_REFRESH_MS);
    expect(loadMyPrize).not.toHaveBeenCalled();
    await advance(PRIZE_IDLE_REFRESH_MS - PRIZE_REFRESH_MS);
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
    expect(screen.getByText("482913")).toBeInTheDocument();
  });

  it("ao voltar para a aba, busca na hora", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: true, rows: [OPEN] });
    render(<PrizeCard initial={[]} enabled />);
    await showTab();
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
    expect(screen.getByText("482913")).toBeInTheDocument();
  });

  it("prêmio retirado: a conta não ganha de novo no evento, então para de buscar", async () => {
    render(<PrizeCard initial={[DELIVERED]} enabled />);
    await advance(PRIZE_IDLE_REFRESH_MS * 3);
    await showTab();
    expect(loadMyPrize).not.toHaveBeenCalled();
  });

  it("função ainda não publicada: não fica buscando", async () => {
    render(<PrizeCard initial={[]} enabled={false} />);
    await advance(PRIZE_IDLE_REFRESH_MS * 3);
    await showTab();
    expect(loadMyPrize).not.toHaveBeenCalled();
  });

  it("se a função deixar de existir, para de buscar", async () => {
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: false, missing: true });
    render(<PrizeCard initial={[OPEN]} enabled />);
    await advance(PRIZE_REFRESH_MS);
    await advance(PRIZE_IDLE_REFRESH_MS * 5);
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
  });

  it("dados novos do servidor (troca de aba, router.refresh) substituem o que estava na tela", async () => {
    // A página mantém o estado do cartão entre navegações: sem isso, quem abriu o painel
    // antes da NEU-167 ficava sem cartão até recarregar.
    vi.mocked(loadMyPrize).mockResolvedValue({ ok: true, rows: [OPEN] });
    const { rerender } = render(<PrizeCard initial={[]} enabled={false} />);
    rerender(<PrizeCard initial={[OPEN]} enabled />);
    expect(screen.getByText("482913")).toBeInTheDocument();
    await advance(PRIZE_REFRESH_MS);
    expect(loadMyPrize).toHaveBeenCalledTimes(1);
  });
});
