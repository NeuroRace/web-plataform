import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { OpPainel, OpPremio } from "@/lib/operador";
import type { OpResult } from "@/lib/operador-data";

const data = vi.hoisted(() => ({
  loadPainel: vi.fn(),
  validarCodigo: vi.fn(),
  executarAcao: vi.fn(),
  mudarConfig: vi.fn(),
}));
vi.mock("@/lib/operador-data", () => data);
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

import { OperadorPanel } from "./OperadorPanel";

const premio = (over: Partial<OpPremio> = {}): OpPremio => ({
  id: "p1",
  round_id: "r3",
  round_name: "Rodada 3",
  round_ends_at: "2026-10-24T15:00:00-03:00",
  posicao: 1,
  display_name: "luna_zen",
  contato: "lu***@gmail.com",
  score: 48.312,
  atencao_media: 71.4,
  status: "avisado",
  prazo: "2026-10-24T15:20:00-03:00",
  entregue_em: null,
  sem_canal: false,
  ...over,
});

const painel = (over: Partial<OpPainel> = {}): OpPainel => ({
  agora: "2026-10-24T15:19:50-03:00",
  config: {
    premiacao_ligada: true,
    pausa_geral: false,
    passar_sozinho: false,
    carencia_min: 5,
    janela_min: 15,
    lembrete_min: 10,
    limite_fila: 5,
    ligada_em: "2026-10-24T13:00:00-03:00",
    evento_atual: "NEXT 2026",
  },
  premios: [premio()],
  registro: [
    { em: "2026-10-24T15:08:00-03:00", operador: "pedro@x.com", acao: "passar", round_name: "Rodada 2", detalhe: null },
  ],
  ...over,
});

const ok = (p: OpPainel): OpResult<OpPainel> => ({ ok: true, data: p });

function renderPanel(initial: OpResult<OpPainel>) {
  return render(<OperadorPanel initial={initial} operador="breq@x.com" />);
}

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  // Relógio do celular 1 min adiantado: a contagem segue o servidor (`agora`).
  vi.setSystemTime(new Date("2026-10-24T15:20:50-03:00"));
  for (const fn of Object.values(data)) fn.mockReset();
  data.loadPainel.mockResolvedValue(ok(painel()));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("OperadorPanel", () => {
  it("conta que não é operadora → sem acesso", () => {
    renderPanel({ ok: false, erro: "sem_acesso" });
    expect(screen.getByRole("heading", { name: "Sem acesso" })).toBeInTheDocument();
    expect(screen.getByText(/breq@x\.com/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Código do prêmio")).not.toBeInTheDocument();
  });

  it("funções ainda fora do banco → premiação não está no ar, sem quebrar", () => {
    renderPanel({ ok: false, erro: "fora_do_ar" });
    expect(screen.getByRole("heading", { name: "A premiação ainda não está no ar" })).toBeInTheDocument();
  });

  it("lista a rodada e o prêmio com contagem pelo relógio do servidor", async () => {
    renderPanel(ok(painel()));
    await tick(1);
    const linha = screen.getByRole("listitem", { name: /luna_zen/ });
    expect(within(linha).getByText("Avisado")).toBeInTheDocument();
    expect(within(linha).getByText("0:10")).toBeInTheDocument();
    expect(within(linha).getByText("lu***@gmail.com")).toBeInTheDocument();
  });

  it("prazo estourado → linha vermelha sem esperar a próxima busca", async () => {
    renderPanel(ok(painel()));
    await tick(11_000);
    const linha = screen.getByRole("listitem", { name: /luna_zen/ });
    expect(within(linha).getByText("Prazo estourou")).toBeInTheDocument();
    expect(linha).toHaveAttribute("data-tone", "alert");
  });

  it("código certo → Entregue grande; o campo limpa", async () => {
    data.validarCodigo.mockResolvedValue({
      ok: true,
      data: { tone: "ok", title: "Entregue", detail: "luna_zen · Rodada 3 · 15:12" },
    });
    renderPanel(ok(painel()));
    const campo = screen.getByLabelText("Código do prêmio");
    fireEvent.change(campo, { target: { value: "123456" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Validar" }));
    });
    expect(data.validarCodigo).toHaveBeenCalledWith(expect.anything(), "123456");
    expect(screen.getByRole("status")).toHaveTextContent("Entregue");
    expect(screen.getByRole("status")).toHaveTextContent("luna_zen · Rodada 3 · 15:12");
    expect(campo).toHaveValue("");
  });

  it("pausa geral ligada aparece no topo, e dá para retomar", async () => {
    data.mudarConfig.mockResolvedValue({ ok: true, data: { ...painel().config, pausa_geral: false } });
    const p = painel();
    renderPanel(ok({ ...p, config: { ...p.config, pausa_geral: true } }));
    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("Pausa geral ligada");
    await act(async () => {
      fireEvent.click(within(aviso).getByRole("button", { name: "Retomar" }));
    });
    expect(data.mudarConfig).toHaveBeenCalledWith(expect.anything(), { pausa_geral: false });
    expect(screen.queryByText("Pausa geral ligada")).not.toBeInTheDocument();
  });

  it("cancelar pede motivo e confirmação antes de chamar o banco", async () => {
    data.executarAcao.mockResolvedValue({ ok: true, data: { feito: true, mensagem: null } });
    renderPanel(ok(painel()));
    const linha = screen.getByRole("listitem", { name: /luna_zen/ });
    fireEvent.click(within(linha).getByRole("button", { name: "Cancelar" }));

    const confirmar = within(linha).getByRole("button", { name: "Confirmar" });
    expect(confirmar).toBeDisabled();
    fireEvent.change(within(linha).getByLabelText("Motivo"), { target: { value: "acabou o brinde" } });
    await act(async () => {
      fireEvent.click(confirmar);
    });
    expect(data.executarAcao).toHaveBeenCalledWith(expect.anything(), "p1", "cancelar", "acabou o brinde");
    // Depois da ação, busca o painel de novo.
    expect(data.loadPainel).toHaveBeenCalled();
  });

  it("erro do banco na ação aparece na linha", async () => {
    data.executarAcao.mockResolvedValue({ ok: true, data: { feito: false, mensagem: "O prêmio já passou" } });
    renderPanel(ok(painel()));
    const linha = screen.getByRole("listitem", { name: /luna_zen/ });
    fireEvent.click(within(linha).getByRole("button", { name: "Passar" }));
    await act(async () => {
      fireEvent.click(within(linha).getByRole("button", { name: "Confirmar" }));
    });
    expect(within(linha).getByText("O prêmio já passou")).toBeInTheDocument();
  });

  it("busca a cada 10 s; falha mantém a tela e avisa", async () => {
    data.loadPainel.mockResolvedValue({ ok: false, erro: "erro" });
    renderPanel(ok(painel()));
    await tick(10_000);
    expect(data.loadPainel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("listitem", { name: /luna_zen/ })).toBeInTheDocument();
    expect(screen.getByText("reconectando…")).toBeInTheDocument();
  });

  it("desempate: tempo com milésimo e atenção média só ao abrir", () => {
    renderPanel(ok(painel()));
    const linha = screen.getByRole("listitem", { name: /luna_zen/ });
    const desempate = within(linha).getByText("Desempate").closest("details");
    expect(desempate).not.toHaveAttribute("open");
    expect(within(desempate as HTMLElement).getByText(/^48,312\s*s$/)).toBeInTheDocument();
    expect(within(desempate as HTMLElement).getByText("71,4")).toBeInTheDocument();
  });
});
