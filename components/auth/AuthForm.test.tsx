import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/auth/AuthForm";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  hardNavigate: vi.fn(),
  next: null as string | null,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: mocks.signUp, signInWithPassword: mocks.signInWithPassword } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => ({ get: () => mocks.next }),
}));

vi.mock("@/lib/hard-navigate", () => ({ hardNavigate: mocks.hardNavigate }));

async function submitSignup(email: string) {
  const user = userEvent.setup();
  render(<AuthForm mode="signup" />);
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/senha/i), "senha-forte-123");
  await user.click(screen.getByRole("button", { name: /criar conta/i }));
}

async function submitLogin() {
  const user = userEvent.setup();
  render(<AuthForm mode="login" />);
  await user.type(screen.getByLabelText(/e-mail/i), "Breq@Exemplo.com");
  await user.type(screen.getByLabelText(/senha/i), "senha-forte-123");
  await user.click(screen.getByRole("button", { name: /entrar/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.next = null;
});

describe("AuthForm (cadastro)", () => {
  it("test_ExistingEmailIsLoud: identities vazio = conta já existe → avisa e NÃO redireciona", async () => {
    // Supabase (anti-enumeração) devolve "sucesso" com identities: [] e não envia e-mail.
    mocks.signUp.mockResolvedValue({ data: { user: { id: "fake", identities: [] }, session: null }, error: null });
    await submitSignup("ja.existe@exemplo.com");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/já tem conta/i);
    expect(within(alert).getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeEnabled();
  });

  it("cadastro novo (identities preenchido, sem sessão) vai para /confirmar", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: null }, error: null });
    await submitSignup("Novo@Exemplo.com");
    expect(mocks.push).toHaveBeenCalledWith("/confirmar?email=novo%40exemplo.com");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("erro do Supabase continua traduzido", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Password should be at least 6 characters" } });
    await submitSignup("x@exemplo.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(/pelo menos 6/);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("AuthForm (login)", () => {
  it("login ok faz navegação completa para o destino, sem router.push", async () => {
    // Com router.push, o prefetch de /dashboard feito ainda deslogado (redirect para /login)
    // ficava no cache do roteador e a tela voltava para o próprio login, presa em "Aguarde...".
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await submitLogin();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "breq@exemplo.com", password: "senha-forte-123" });
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("respeita o next interno", async () => {
    mocks.next = "/dashboard?tab=perfil";
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await submitLogin();
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard?tab=perfil");
  });

  it.each(["https://outro.site", "//outro.site", "/\\outro.site", "@outro.site", "javascript:alert(1)"])(
    "next externo (%s) cai no /dashboard",
    async (next) => {
      mocks.next = next;
      mocks.signInWithPassword.mockResolvedValue({ error: null });
      await submitLogin();
      expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard");
    },
  );

  it("erro de login não navega e libera o botão", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    await submitLogin();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(mocks.hardNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeEnabled();
  });
});

describe("AuthForm (cadastro com sessão imediata)", () => {
  it("também navega por completo", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: { access_token: "t" } }, error: null });
    await submitSignup("novo@exemplo.com");
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
