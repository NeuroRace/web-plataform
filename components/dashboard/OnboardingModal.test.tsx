import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";

// O formulário real fala com o Supabase; aqui só importa o callback de "salvou".
vi.mock("@/components/ranking/DisplayNameForm", () => ({
  DisplayNameForm: ({ onSaved }: { onSaved?: () => void }) => (
    <button type="button" onClick={() => onSaved?.()}>
      Salvar
    </button>
  ),
}));

beforeEach(() => {
  sessionStorage.clear();
});

describe("OnboardingModal", () => {
  it("abre como diálogo quando a pessoa ainda não tem apelido", () => {
    render(<OnboardingModal userId="u1" initialName={null} />);
    expect(screen.getByRole("dialog", { name: "Bem-vindo ao NeuroRace!" })).toBeInTheDocument();
  });

  it("não abre para quem já tem apelido", () => {
    render(<OnboardingModal userId="u1" initialName="Breq" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Pular por enquanto' fecha e não reabre na mesma sessão", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<OnboardingModal userId="u1" initialName={null} />);
    await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    unmount();
    render(<OnboardingModal userId="u1" initialName={null} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Esc fecha o diálogo", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal userId="u1" initialName={null} />);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("depois de salvar, continua aberto com 'Fechar' mesmo quando o apelido chega", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OnboardingModal userId="u1" initialName={null} />);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    // router.refresh() re-renderiza a página com o apelido já salvo
    rerender(<OnboardingModal userId="u1" initialName="Breq" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("trava a rolagem da página enquanto está aberto", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal userId="u1" initialName={null} />);
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(screen.getByRole("button", { name: "Pular por enquanto" }));
    expect(document.body.style.overflow).toBe("");
  });
});
