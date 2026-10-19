import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/auth/AuthForm";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  hardNavigate: vi.fn(),
  params: {} as Record<string, string | null>,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp: mocks.signInWithOtp, verifyOtp: mocks.verifyOtp } }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (k: string) => mocks.params[k] ?? null }),
}));

vi.mock("@/lib/hard-navigate", () => ({ hardNavigate: mocks.hardNavigate }));

const ok = { error: null };

async function pedirCodigo(identificador: string) {
  const user = userEvent.setup();
  render(<AuthForm />);
  await user.type(screen.getByLabelText(/e-mail ou celular/i), identificador);
  await user.click(screen.getByRole("button", { name: /enviar código/i }));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = {};
  mocks.signInWithOtp.mockResolvedValue(ok);
  mocks.verifyOtp.mockResolvedValue(ok);
});

describe("escolha entre e-mail e celular", () => {
  it("e-mail chama signInWithOtp com email", async () => {
    await pedirCodigo("Breq@Exemplo.com");
    expect(mocks.signInWithOtp).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithOtp.mock.calls[0][0]).toMatchObject({ email: "breq@exemplo.com" });
  });

  it("celular chama signInWithOtp com phone em E.164", async () => {
    await pedirCodigo("(11) 98765-4321");
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({ phone: "+5511987654321" });
  });

  it("entrada invalida nem chega no Supabase", async () => {
    await pedirCodigo("12345");
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/celular inválido/i);
  });
});

describe("tela do codigo", () => {
  it("e-mail aceita 8 digitos", async () => {
    await pedirCodigo("breq@exemplo.com");
    const campo = await screen.findByLabelText(/^código$/i);
    expect(campo).toHaveAttribute("maxlength", "8");
    expect(campo).toHaveAttribute("inputmode", "numeric");
    expect(campo).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("SMS aceita 6 digitos", async () => {
    await pedirCodigo("11987654321");
    expect(await screen.findByLabelText(/^código$/i)).toHaveAttribute("maxlength", "6");
  });

  it("codigo certo verifica com o tipo certo e navega", async () => {
    const user = await pedirCodigo("breq@exemplo.com");
    await user.type(await screen.findByLabelText(/^código$/i), "12345678");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      email: "breq@exemplo.com",
      token: "12345678",
      type: "email",
    });
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("celular verifica com type sms", async () => {
    const user = await pedirCodigo("11987654321");
    await user.type(await screen.findByLabelText(/^código$/i), "123456");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      phone: "+5511987654321",
      token: "123456",
      type: "sms",
    });
  });

  it("o reenvio so libera depois de 60 s", async () => {
    await pedirCodigo("breq@exemplo.com");
    expect(await screen.findByRole("button", { name: /reenviar código em 60s/i })).toBeDisabled();
  });
});

describe("mensagens de erro", () => {
  it("codigo errado", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "Token has invalid format" } });
    const user = await pedirCodigo("breq@exemplo.com");
    await user.type(await screen.findByLabelText(/^código$/i), "00000000");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/código incorreto/i);
    expect(mocks.hardNavigate).not.toHaveBeenCalled();
  });

  it("codigo vencido tem mensagem propria", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "Token has expired" } });
    const user = await pedirCodigo("breq@exemplo.com");
    await user.type(await screen.findByLabelText(/^código$/i), "00000000");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/venceu/i);
  });

  it("429 vira 'espere um pouco', nao erro generico", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { message: "rate limit exceeded", status: 429 } });
    await pedirCodigo("breq@exemplo.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(/espere um pouco/i);
  });

  it("falha no envio nao leva para a tela do codigo", async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { message: "smtp down" } });
    await pedirCodigo("breq@exemplo.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(/não deu para enviar/i);
    expect(screen.queryByLabelText(/^código$/i)).toBeNull();
  });
});

// O link do e-mail que falha volta para /login?error=confirm. Antes da NEU-161
// ninguem lia esse parametro e a pessoa caia aqui sem explicacao nenhuma.
describe("erro vindo do link do e-mail", () => {
  it("?error=confirm e explicado na tela", () => {
    mocks.params = { error: "confirm" };
    render(<AuthForm />);
    expect(screen.getByRole("alert")).toHaveTextContent(/link não funcionou ou já venceu/i);
  });

  it("sem ?error nao mostra alerta nenhum", () => {
    render(<AuthForm />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("next", () => {
  it("destino externo cai no /dashboard", async () => {
    mocks.params = { next: "/\t/example.com" };
    const user = await pedirCodigo("breq@exemplo.com");
    await user.type(await screen.findByLabelText(/^código$/i), "12345678");
    await user.click(screen.getByRole("button", { name: /^entrar$/i }));

    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
