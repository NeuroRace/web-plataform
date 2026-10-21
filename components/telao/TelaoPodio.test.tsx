import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import type { RankingSnapshot } from "@/lib/ranking-data";
import type { RankingWindow } from "@/lib/ranking";

const loadRanking = vi.fn();
vi.mock("@/lib/ranking-data", () => ({
  loadRanking: (...args: unknown[]) => loadRanking(...args),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
// A saída animada do motion roda em frames que os timers falsos do jsdom não avançam.
// O teste prova a regra (some depois de 3,6 s), não a animação.
vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { TelaoPodio } from "./TelaoPodio";

const rodada1: RankingWindow = {
  id: "1",
  name: "Rodada 1",
  starts_at: "2026-09-30T10:00:00-03:00",
  ends_at: "2026-09-30T12:00:00-03:00",
};
const rodada2: RankingWindow = {
  id: "2",
  name: "Rodada 2",
  starts_at: "2026-09-30T12:00:00-03:00",
  ends_at: "2026-09-30T14:00:00-03:00",
};

const rows = (...names: string[]) =>
  names.map((display_name, i) => ({ rank: i + 1, display_name, score: 12.9 + i }));

const snap = (over: Partial<RankingSnapshot> = {}): RankingSnapshot => ({
  windows: { eventStart: rodada1.starts_at, current: rodada2, previous: rodada1 },
  event: { rows: rows("Geral1", "Geral2"), error: false },
  round: { rows: rows("luna_zen", "Ana", "mente_veloz", "Bia", "caio.f"), error: false },
  previousWinner: null,
  failed: false,
  fetchedAt: "2026-09-30T15:30:00.000Z",
  ...over,
});

const QR = '<svg data-testid="qr"></svg>';

function renderPodio(initial: RankingSnapshot, carousel = false) {
  return render(
    <TelaoPodio initial={initial} qrSvg={QR} host="neurorace-v2.vercel.app" carousel={carousel} />,
  );
}

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date("2026-09-30T12:35:23-03:00"));
  loadRanking.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("TelaoPodio", () => {
  it("rodada atual: nome, pódio 2º-1º-3º e o resto do 4º em diante", () => {
    renderPodio(snap());
    expect(screen.getByRole("heading", { name: "Rodada 2" })).toBeInTheDocument();

    const podio = within(screen.getByRole("list", { name: "Pódio" })).getAllByRole("listitem");
    expect(podio.map((li) => li.getAttribute("aria-label"))).toEqual([
      "2º lugar: Ana, 13,9\u00a0s",
      "1º lugar: luna_zen, 12,9\u00a0s",
      "3º lugar: mente_veloz, 14,9\u00a0s",
    ]);

    const resto = within(screen.getByRole("list", { name: "Do 4º ao 9º" })).getAllByRole(
      "listitem",
    );
    expect(resto.map((li) => li.textContent)).toEqual(["4Bia15,9\u00a0s", "5caio.f16,9\u00a0s"]);
  });

  it("cronômetro regressivo da rodada em H:MM:SS, a cada segundo", async () => {
    renderPodio(snap());
    await tick(1);
    expect(screen.getByLabelText("Tempo restante da rodada")).toHaveTextContent("1:24:37");
    await tick(1_000);
    expect(screen.getByLabelText("Tempo restante da rodada")).toHaveTextContent("1:24:36");
  });

  it("sem rodada acontecendo: pódio do geral do evento, sem cronômetro", () => {
    renderPodio(snap({ windows: null, round: null }));
    expect(screen.getByRole("heading", { name: "Geral do evento" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tempo restante da rodada")).not.toBeInTheDocument();
    expect(screen.getByLabelText("1º lugar: Geral1, 12,9 s")).toBeInTheDocument();
  });

  it("rodada sem corridas: convite, sem pódio vazio", () => {
    renderPodio(snap({ round: { rows: [], error: false } }));
    expect(screen.getByText("A rodada começou")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Pódio" })).not.toBeInTheDocument();
  });

  it("menos de 3 corridas: posições vagas no pódio", () => {
    renderPodio(snap({ round: { rows: rows("Ana"), error: false } }));
    expect(screen.getByLabelText("2º lugar: vago")).toBeInTheDocument();
    expect(screen.getByLabelText("3º lugar: vago")).toBeInTheDocument();
  });

  it("NOVO LÍDER: outra pessoa assume o 1º da rodada → celebra e some depois de 3,6 s", async () => {
    loadRanking.mockResolvedValue(
      snap({ round: { rows: rows("Theo", "luna_zen", "Ana"), error: false } }),
    );
    renderPodio(snap());
    expect(screen.queryByText("NOVO LÍDER DA RODADA")).not.toBeInTheDocument();

    await tick(15_000);
    const overlay = screen.getByRole("status");
    expect(overlay).toHaveTextContent("NOVO LÍDER DA RODADA");
    expect(overlay).toHaveTextContent("Theo");

    await tick(3_599);
    expect(screen.getByRole("status")).toBeInTheDocument();
    await tick(1);
    expect(screen.queryByText("NOVO LÍDER DA RODADA")).not.toBeInTheDocument();
  });

  it("mesmo líder na atualização: não celebra", async () => {
    loadRanking.mockResolvedValue(snap());
    renderPodio(snap());
    await tick(15_000);
    expect(loadRanking).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("NOVO LÍDER DA RODADA")).not.toBeInTheDocument();
  });

  it("troca de rodada: o placar zera sem celebrar", async () => {
    const rodada3 = { ...rodada2, id: "3", name: "Rodada 3" };
    loadRanking.mockResolvedValue(
      snap({
        windows: { eventStart: rodada1.starts_at, current: rodada3, previous: rodada2 },
        round: { rows: rows("Theo"), error: false },
      }),
    );
    renderPodio(snap());
    await tick(15_000);
    expect(screen.getByRole("heading", { name: "Rodada 3" })).toBeInTheDocument();
    expect(screen.queryByText("NOVO LÍDER DA RODADA")).not.toBeInTheDocument();
  });

  it("falha na atualização: mantém o pódio e troca o AO VIVO por um aviso discreto", async () => {
    loadRanking.mockResolvedValue(snap({ round: { rows: [], error: true }, failed: true }));
    renderPodio(snap());
    expect(screen.getByText("AO VIVO · melhor tempo")).toBeInTheDocument();

    await tick(15_000);
    expect(screen.getByLabelText("1º lugar: luna_zen, 12,9 s")).toBeInTheDocument();
    expect(screen.getByText("reconectando…")).toBeInTheDocument();
    expect(screen.queryByText("NOVO LÍDER DA RODADA")).not.toBeInTheDocument();
  });

  it("sem texto explicativo; convite com QR e o host do site", () => {
    renderPodio(snap());
    expect(screen.queryByText(/Atualiza sozinho/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Só apelidos/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code para neurorace-v2.vercel.app" })).toBeInTheDocument();
    expect(screen.getByText("neurorace-v2.vercel.app")).toBeInTheDocument();
  });

  it("pede só o top 9 ao atualizar", async () => {
    loadRanking.mockResolvedValue(snap());
    renderPodio(snap());
    await tick(15_000);
    expect(loadRanking).toHaveBeenCalledWith(expect.anything(), expect.any(Date), { limit: 9 });
  });
});

describe("TelaoPodio no modo Carrossel (NEU-123)", () => {
  const heading = () => screen.getByRole("heading", { level: 1 });

  it("alterna Pódio da rodada (20 s) → geral do evento (12 s) → Como jogar (12 s) → rodada", async () => {
    loadRanking.mockResolvedValue(snap());
    renderPodio(snap(), true);
    expect(heading()).toHaveTextContent("Rodada 2");
    expect(screen.getByLabelText("1º lugar: luna_zen, 12,9 s")).toBeInTheDocument();

    await tick(19_999);
    expect(heading()).toHaveTextContent("Rodada 2");
    await tick(1);
    expect(heading()).toHaveTextContent("Geral do evento");
    expect(screen.getByLabelText("1º lugar: Geral1, 12,9 s")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tempo restante da rodada")).not.toBeInTheDocument();

    await tick(12_000);
    expect(heading()).toHaveTextContent("Como jogar");
    expect(screen.queryByRole("list", { name: "Pódio" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code para neurorace-v2.vercel.app" })).toBeInTheDocument();

    await tick(12_000);
    expect(heading()).toHaveTextContent("Rodada 2");
  });

  it("sem rodada acontecendo: só geral do evento e Como jogar", async () => {
    loadRanking.mockResolvedValue(snap({ windows: null, round: null }));
    renderPodio(snap({ windows: null, round: null }), true);
    expect(heading()).toHaveTextContent("Geral do evento");
    await tick(12_000);
    expect(heading()).toHaveTextContent("Como jogar");
    await tick(12_000);
    expect(heading()).toHaveTextContent("Geral do evento");
  });

  it("mostra em qual tela está", async () => {
    loadRanking.mockResolvedValue(snap());
    renderPodio(snap(), true);
    expect(screen.getByLabelText("Tela 1 de 3")).toBeInTheDocument();
    await tick(20_000);
    expect(screen.getByLabelText("Tela 2 de 3")).toBeInTheDocument();
  });

  it("NOVO LÍDER celebra mesmo fora da tela da rodada", async () => {
    loadRanking
      .mockResolvedValueOnce(snap())
      .mockResolvedValue(snap({ round: { rows: rows("Theo", "luna_zen", "Ana"), error: false } }));
    renderPodio(snap(), true);
    // Uma busca por vez: num avanço só de 30 s, a 2ª cairia com a 1ª ainda em voo.
    await tick(15_000);
    await tick(15_000);
    expect(heading()).toHaveTextContent("Geral do evento");
    expect(screen.getByRole("status")).toHaveTextContent("Theo");
  });

  it("Pódio (padrão) não alterna", async () => {
    loadRanking.mockResolvedValue(snap());
    renderPodio(snap());
    await tick(45_000);
    expect(heading()).toHaveTextContent("Rodada 2");
    expect(screen.queryByLabelText(/^Tela \d de \d$/)).not.toBeInTheDocument();
  });

  it("o operador troca Pódio ↔ Carrossel sem sair do telão", () => {
    const { unmount } = renderPodio(snap());
    expect(screen.getByRole("link", { name: "Carrossel" })).toHaveAttribute(
      "href",
      "/ranking?telao=1&modo=carrossel",
    );
    unmount();
    renderPodio(snap(), true);
    expect(screen.getByRole("link", { name: "Pódio" })).toHaveAttribute("href", "/ranking?telao=1");
  });
});
