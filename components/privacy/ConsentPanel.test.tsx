import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentPanel } from "@/components/privacy/ConsentPanel";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { updateUser: mocks.updateUser } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const granted = {
  term_version: "v1",
  granted_at: "2026-09-25T12:00:00.000Z",
  channel: "web" as const,
  revoked_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe("ConsentPanel (NEU-103)", () => {
  it("sem consentimento: explica e tem link para a política", () => {
    render(<ConsentPanel consent={null} />);
    expect(screen.getByText(/NeuroCoach está desligado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /política de privacidade/i })).toHaveAttribute(
      "href",
      "/privacidade",
    );
  });

  it("não autoriza sem marcar o checkbox", async () => {
    const user = userEvent.setup();
    render(<ConsentPanel consent={null} />);
    expect(screen.getByRole("button", { name: /autorizar/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /autorizar/i }));
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("autoriza: grava consentimento v1 web e recarrega", async () => {
    const user = userEvent.setup();
    render(<ConsentPanel consent={null} />);
    await user.click(screen.getByRole("checkbox", { name: /autorizo/i }));
    await user.click(screen.getByRole("button", { name: /autorizar/i }));

    const consent = mocks.updateUser.mock.calls[0][0].data.lgpd_consent;
    expect(consent).toMatchObject({ term_version: "v1", channel: "web", revoked_at: null });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("com consentimento: mostra a data e permite retirar", async () => {
    const user = userEvent.setup();
    render(<ConsentPanel consent={granted} />);
    expect(screen.getByText(/autorizado em/i)).toHaveTextContent("25/09/2026");

    await user.click(screen.getByRole("button", { name: /retirar autorização/i }));
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    const consent = mocks.updateUser.mock.calls[0][0].data.lgpd_consent;
    expect(consent.granted_at).toBe(granted.granted_at);
    expect(Date.parse(consent.revoked_at)).not.toBeNaN();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("retirar pede confirmação antes de gravar", async () => {
    const user = userEvent.setup();
    render(<ConsentPanel consent={granted} />);
    await user.click(screen.getByRole("button", { name: /retirar autorização/i }));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.getByRole("button", { name: /retirar autorização/i })).toBeInTheDocument();
  });

  it("erro do Supabase aparece como alerta", async () => {
    mocks.updateUser.mockResolvedValue({ data: {}, error: { message: "boom" } });
    const user = userEvent.setup();
    render(<ConsentPanel consent={null} />);
    await user.click(screen.getByRole("checkbox", { name: /autorizo/i }));
    await user.click(screen.getByRole("button", { name: /autorizar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível/i);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
