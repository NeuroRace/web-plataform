import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/auth/AuthForm";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signUp: mocks.signUp, signInWithPassword: mocks.signInWithPassword } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => ({ get: () => null }),
}));

async function submitSignup(email: string, { consent = true } = {}) {
  const user = userEvent.setup();
  render(<AuthForm mode="signup" />);
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/senha/i), "senha-forte-123");
  if (consent) await user.click(screen.getByRole("checkbox", { name: /autorizo/i }));
  await user.click(screen.getByRole("button", { name: /criar conta/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("NEU-103: sem marcar a autorização, não cria a conta", async () => {
    await submitSignup("novo@exemplo.com", { consent: false });
    expect(await screen.findByRole("alert")).toHaveTextContent(/autorizar/i);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("NEU-103: o checkbox tem link para a política de privacidade", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByRole("link", { name: /política de privacidade/i })).toHaveAttribute(
      "href",
      "/privacidade",
    );
  });

  it("NEU-103: com a autorização, grava o consentimento v1 (canal web) no cadastro", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: null }, error: null });
    await submitSignup("novo@exemplo.com");
    const consent = mocks.signUp.mock.calls[0][0].options.data.lgpd_consent;
    expect(consent).toMatchObject({ term_version: "v1", channel: "web", revoked_at: null });
    expect(Date.parse(consent.granted_at)).not.toBeNaN();
  });

  it("NEU-103: login não mostra o checkbox de autorização", () => {
    render(<AuthForm mode="login" />);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("erro do Supabase continua traduzido", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Password should be at least 6 characters" } });
    await submitSignup("x@exemplo.com");
    expect(await screen.findByRole("alert")).toHaveTextContent(/pelo menos 6/);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
