import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactsCard } from "@/components/dashboard/ContactsCard";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
  hardNavigate: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { updateUser: mocks.updateUser, verifyOtp: mocks.verifyOtp } }),
}));

vi.mock("@/lib/hard-navigate", () => ({ hardNavigate: mocks.hardNavigate }));

const ok = { data: {}, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateUser.mockResolvedValue(ok);
  mocks.verifyOtp.mockResolvedValue(ok);
});

type Contatos = { email: string | null; phone: string | null };

async function adicionar(botao: RegExp, contato: string, props: Contatos = { email: "joana@exemplo.com", phone: null }) {
  const user = userEvent.setup();
  render(<ContactsCard {...props} />);
  await user.click(screen.getByRole("button", { name: botao }));
  await user.type(screen.getByLabelText(/^(celular|e-mail)$/i), contato);
  await user.click(screen.getByRole("button", { name: /enviar código/i }));
  return user;
}

describe("o que aparece", () => {
  it("mostra o e-mail confirmado e oferece adicionar o celular", () => {
    render(<ContactsCard email="joana@exemplo.com" phone={null} />);
    expect(screen.getByRole("heading", { name: "Seus contatos" })).toBeInTheDocument();
    expect(screen.getByText("joana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar celular" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar e-mail" })).toBeNull();
  });

  it("conta de celular: celular mascarado e oferece adicionar o e-mail", () => {
    render(<ContactsCard email={null} phone="5511987654321" />);
    expect(screen.getByText("+55 11 9••••-4321")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar e-mail" })).toBeInTheDocument();
  });

  it("com os dois contatos, não oferece adicionar nada", () => {
    render(<ContactsCard email="joana@exemplo.com" phone="5511987654321" />);
    expect(screen.queryByRole("button", { name: /adicionar/i })).toBeNull();
  });
});

describe("adicionar celular", () => {
  it("mostra a linha de aceite do WhatsApp (NEU-150)", async () => {
    const user = userEvent.setup();
    render(<ContactsCard email="joana@exemplo.com" phone={null} />);
    await user.click(screen.getByRole("button", { name: "Adicionar celular" }));
    expect(screen.getByText(/avisa por WhatsApp.*Responda SAIR para parar/)).toBeInTheDocument();
  });

  it("pede o código com updateUser({ phone }) em E.164 e confirma com phone_change", async () => {
    const user = await adicionar(/adicionar celular/i, "(11) 98765-4321");
    expect(mocks.updateUser).toHaveBeenCalledWith({ phone: "+5511987654321" });

    const campo = await screen.findByLabelText(/^código$/i);
    expect(campo).toHaveAttribute("maxlength", "6");
    await user.type(campo, "123456");
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));

    expect(mocks.verifyOtp).toHaveBeenCalledWith({ phone: "+5511987654321", token: "123456", type: "phone_change" });
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard?tab=perfil");
  });

  it("celular de outra conta: mensagem própria e fica no formulário", async () => {
    mocks.updateUser.mockResolvedValue({
      data: {},
      error: { message: "A user with this phone number has already been registered", code: "phone_exists", status: 422 },
    });
    await adicionar(/adicionar celular/i, "11987654321");
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse celular já está em outra conta.");
    expect(screen.queryByLabelText(/^código$/i)).toBeNull();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("e-mail no campo de celular nem chega no Supabase", async () => {
    await adicionar(/adicionar celular/i, "joana@exemplo.com");
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/celular inválido/i);
  });
});

describe("adicionar e-mail", () => {
  const contaDeCelular = { email: null, phone: "5511987654321" };

  it("pede o código com updateUser({ email }) e confirma com email_change", async () => {
    const user = await adicionar(/adicionar e-mail/i, "Joana@Exemplo.com", contaDeCelular);
    expect(mocks.updateUser.mock.calls[0][0]).toEqual({ email: "joana@exemplo.com" });
    expect(mocks.updateUser.mock.calls[0][1].emailRedirectTo).toMatch(
      /\/auth\/callback\?next=%2Fdashboard%3Ftab%3Dperfil$/,
    );

    const campo = await screen.findByLabelText(/^código$/i);
    expect(campo).toHaveAttribute("maxlength", "8");
    await user.type(campo, "12345678");
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));

    expect(mocks.verifyOtp).toHaveBeenCalledWith({ email: "joana@exemplo.com", token: "12345678", type: "email_change" });
    expect(mocks.hardNavigate).toHaveBeenCalledWith("/dashboard?tab=perfil");
  });

  it("e-mail de outra conta: mensagem própria", async () => {
    mocks.updateUser.mockResolvedValue({
      data: {},
      error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 },
    });
    await adicionar(/adicionar e-mail/i, "outra@exemplo.com", contaDeCelular);
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse e-mail já está em outra conta.");
  });
});

describe("código", () => {
  async function conferir(erro: { message: string; status?: number }) {
    mocks.verifyOtp.mockResolvedValue({ data: {}, error: erro });
    const user = await adicionar(/adicionar celular/i, "11987654321");
    await user.type(await screen.findByLabelText(/^código$/i), "000000");
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));
  }

  it("errado", async () => {
    await conferir({ message: "Token has invalid format" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/código incorreto/i);
    expect(mocks.hardNavigate).not.toHaveBeenCalled();
  });

  it("vencido", async () => {
    await conferir({ message: "Token has expired or is invalid" });
    expect(await screen.findByRole("alert")).toHaveTextContent(/venceu/i);
  });

  it("muitas tentativas", async () => {
    await conferir({ message: "rate limit exceeded", status: 429 });
    expect(await screen.findByRole("alert")).toHaveTextContent(/espere um pouco/i);
  });

  it("o reenvio só libera depois de 60 s", async () => {
    await adicionar(/adicionar celular/i, "11987654321");
    expect(await screen.findByRole("button", { name: /reenviar código em 60s/i })).toBeDisabled();
  });
});
