import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareCard, SHARE_IMAGE_URL } from "@/components/share/ShareCard";

const png = new Blob(["png"], { type: "image/png" });

/** Resposta do fetch como o navegador entrega: `redirected` e `content-type` contam. */
function response({
  status = 200,
  type = "image/png",
  redirected = false,
}: { status?: number; type?: string; redirected?: boolean } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    redirected,
    headers: new Headers({ "content-type": type }),
    blob: () => Promise.resolve(type === "image/png" ? png : new Blob(["<html>"], { type })),
  };
}

// Sessão expirada: o proxy manda o /dashboard/compartilhar para o /login, e o fetch
// segue o redirect e recebe a página de login com 200.
const loginPage = () => response({ type: "text/html; charset=utf-8", redirected: true });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error: limpa o que o teste pendurou no navigator
  delete navigator.share;
  // @ts-expect-error: idem
  delete navigator.canShare;
});

describe("ShareCard", () => {
  it("mostra a prévia e o link de download da imagem", () => {
    render(<ShareCard />);
    expect(screen.getByRole("img", { name: /prévia do seu card/i })).toHaveAttribute("src", SHARE_IMAGE_URL);
    expect(screen.getByRole("link", { name: "Baixar imagem" })).toHaveAttribute("href", SHARE_IMAGE_URL);
  });

  it("com suporte a arquivo, abre o menu de compartilhar do sistema com o PNG", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(fetch).toHaveBeenCalledWith(SHARE_IMAGE_URL, { cache: "no-store" });
    const file = share.mock.calls[0][0].files[0] as File;
    expect(file.name).toBe("neurorace-stories.png");
    expect(file.type).toBe("image/png");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("sem suporte (desktop), baixa a imagem", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(URL.createObjectURL).toHaveBeenCalledWith(png);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("fechar o menu sem escolher nada não mostra erro", async () => {
    Object.assign(navigator, {
      share: vi.fn().mockRejectedValue(new DOMException("cancelado", "AbortError")),
      canShare: () => true,
    });
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartilhar" })).toBeEnabled();
  });

  it("falha ao gerar a imagem mostra aviso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ status: 500, type: "text/plain" })));
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não consegui gerar/i);
  });

  it("sessão expirada: não compartilha a página de login como PNG e pede para entrar de novo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginPage()));
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/sessão expirou/i);
    expect(screen.getByRole("link", { name: "Entre de novo" })).toHaveAttribute("href", "/login?next=%2Fdashboard");
    expect(share).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("resposta 200 que não é PNG não vira arquivo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ type: "text/html" })));
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/não consegui gerar/i);
    expect(share).not.toHaveBeenCalled();
  });

  it("'Baixar imagem' baixa o PNG conferido", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("link", { name: "Baixar imagem" }));

    expect(fetch).toHaveBeenCalledWith(SHARE_IMAGE_URL, { cache: "no-store" });
    expect(URL.createObjectURL).toHaveBeenCalledWith(png);
    click.mockRestore();
  });

  it("'Baixar imagem' com a sessão expirada não baixa a página de login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(loginPage()));
    const user = userEvent.setup();
    render(<ShareCard />);
    await user.click(screen.getByRole("link", { name: "Baixar imagem" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/sessão expirou/i);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("sem arquétipo disponível, não mostra a escolha de modelo", () => {
    render(<ShareCard />);
    expect(screen.queryByRole("group", { name: "Modelo do card" })).not.toBeInTheDocument();
  });

  it("modelo 'Meu arquétipo' troca prévia, download e o PNG compartilhado", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    const user = userEvent.setup();
    render(<ShareCard archetype />);

    await user.click(screen.getByRole("button", { name: "Meu arquétipo" }));
    const src = `${SHARE_IMAGE_URL}?modelo=arquetipo`;
    expect(screen.getByRole("button", { name: "Meu arquétipo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: /prévia do seu card/i })).toHaveAttribute("src", src);
    expect(screen.getByRole("link", { name: "Baixar imagem" })).toHaveAttribute("href", src);

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(fetch).toHaveBeenCalledWith(src, { cache: "no-store" });
    expect((share.mock.calls[0][0].files[0] as File).name).toBe("neurorace-arquetipo.png");
  });
});
