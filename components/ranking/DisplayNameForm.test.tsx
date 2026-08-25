import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisplayNameForm } from "@/components/ranking/DisplayNameForm";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  update: vi.fn(),
  from: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mocks.from }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

/** Encadeamento real: from("profiles").update({...}).eq("id", userId) */
function mockUpdate(result: { error: { code?: string; message: string } | null }) {
  mocks.eq.mockResolvedValue(result);
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ update: mocks.update });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdate({ error: null });
});

describe("DisplayNameForm", () => {
  it("recusa apelido curto sem tocar no banco", async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "ab");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/3 e 20/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("recusa apelido acima de 20 caracteres sem tocar no banco", async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "a".repeat(21));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/3 e 20/);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("salva o apelido e confirma", async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "Breq");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/salvo/i);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "Breq" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "u1");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("apara espaços das pontas (o CHECK do banco exige btrim)", async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "  Breq  ");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await screen.findByRole("status");
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "Breq" });
  });

  it("traduz 23505 (unique_violation) para 'apelido em uso'", async () => {
    mockUpdate({ error: { code: "23505", message: "duplicate key value" } });
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "PedroT");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/j[áa] est[áa] em uso/i);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("erro desconhecido não vaza mensagem crua do Postgres", async () => {
    mockUpdate({ error: { code: "42501", message: "permission denied for table profiles" } });
    const user = userEvent.setup();
    render(<DisplayNameForm userId="u1" initialName={null} />);

    await user.type(screen.getByLabelText(/apelido/i), "Breq");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).not.toHaveTextContent(/permission denied/i);
  });

  it("pré-preenche com o apelido atual", () => {
    render(<DisplayNameForm userId="u1" initialName="Breq" />);
    expect(screen.getByLabelText(/apelido/i)).toHaveValue("Breq");
  });
});
