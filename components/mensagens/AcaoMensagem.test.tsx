import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AcaoMensagem } from "@/components/mensagens/AcaoMensagem";

const mocks = vi.hoisted(() => ({ executarAcao: vi.fn() }));

vi.mock("@/lib/mensagens", async (original) => ({
  ...(await original<typeof import("@/lib/mensagens")>()),
  executarAcao: mocks.executarAcao,
}));

function token(a: string): string {
  return `${btoa(JSON.stringify({ a, m: "x", exp: 1 })).replaceAll("=", "")}.assinatura`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.executarAcao.mockResolvedValue("feito");
});

describe("AcaoMensagem", () => {
  it("abrir o link nao faz nada sem o clique (antivirus de e-mail abre links)", () => {
    render(<AcaoMensagem token={token("recusar")} />);
    expect(mocks.executarAcao).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /abrir mão do prêmio/i })).toBeInTheDocument();
    expect(screen.getByText(/não dá para desfazer/i)).toBeInTheDocument();
  });

  it("recusar: o clique confirma e mostra que o premio passou", async () => {
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("recusar")} />);
    await user.click(screen.getByRole("button", { name: /não vou poder buscar/i }));
    expect(mocks.executarAcao).toHaveBeenCalledTimes(1);
    expect(mocks.executarAcao).toHaveBeenCalledWith(token("recusar"));
    expect(await screen.findByRole("status")).toHaveTextContent(/passou para o próximo colocado/i);
    expect(screen.queryByRole("button", { name: /não vou poder buscar/i })).not.toBeInTheDocument();
  });

  it("sair: o clique confirma e mostra que parou", async () => {
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("sair")} />);
    expect(screen.getByRole("heading", { name: /parar de receber e-mails/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /parar de receber/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/não vai mais receber/i);
  });

  it("enquanto confirma, o botao fica desabilitado (sem clique duplo)", async () => {
    let soltar: (v: string) => void = () => {};
    mocks.executarAcao.mockReturnValue(new Promise((r) => (soltar = r)));
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("sair")} />);
    await user.click(screen.getByRole("button", { name: /parar de receber/i }));
    const botao = screen.getByRole("button", { name: /confirmando/i });
    expect(botao).toBeDisabled();
    await user.click(botao);
    expect(mocks.executarAcao).toHaveBeenCalledTimes(1);
    soltar("feito");
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("premio que ja nao vale: explica", async () => {
    mocks.executarAcao.mockResolvedValue("ja_resolvido");
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("recusar")} />);
    await user.click(screen.getByRole("button", { name: /não vou poder buscar/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/já não está mais com você/i);
  });

  it("link invalido no servidor: avisa e nao oferece tentar de novo", async () => {
    mocks.executarAcao.mockResolvedValue("link_invalido");
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("sair")} />);
    await user.click(screen.getByRole("button", { name: /parar de receber/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/link inválido ou vencido/i);
    expect(screen.queryByRole("button", { name: /tentar de novo/i })).not.toBeInTheDocument();
  });

  it("erro: oferece tentar de novo", async () => {
    mocks.executarAcao.mockResolvedValueOnce("erro").mockResolvedValueOnce("feito");
    const user = userEvent.setup();
    render(<AcaoMensagem token={token("sair")} />);
    await user.click(screen.getByRole("button", { name: /parar de receber/i }));
    await user.click(await screen.findByRole("button", { name: /tentar de novo/i }));
    expect(mocks.executarAcao).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("status")).toHaveTextContent(/não vai mais receber/i);
  });

  it("token ausente ou ilegivel: link invalido direto, sem botao", () => {
    render(<AcaoMensagem token={null} />);
    expect(screen.getByRole("heading", { name: /link inválido/i })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(mocks.executarAcao).not.toHaveBeenCalled();
  });
});
