import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionTab } from "./CollectionTab";

const UNLOCKS = [
  { id: "neurorace", at: "2026-09-27T15:00:00.000Z", metric: null },
  { id: "piloto-neurorace", at: "2026-09-27T15:00:00.000Z", metric: null },
  { id: "hiperfocado", at: "2026-09-30T02:30:00.000Z", metric: "Foco médio de 70" },
  { id: "largada-relampago", at: "2026-09-29T20:30:00.000Z", metric: "Foco de 70 no começo" },
];

describe("aba Coleção (NEU-134)", () => {
  it("test_CollectionStrips_mostra_as_duas_faixas_com_todos_os_itens_e_o_contador", () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    expect(screen.getByText("4 de 17")).toBeInTheDocument();
    const frames = screen.getByRole("list", { name: "Molduras" });
    const stickers = screen.getByRole("list", { name: "Figurinhas" });
    expect(within(frames).getAllByRole("button")).toHaveLength(8);
    expect(within(stickers).getAllByRole("button")).toHaveLength(9);
  });

  it("test_CollectionLocked_item_bloqueado_diz_bloqueada_e_fica_apagado", () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    const locked = screen.getByRole("button", { name: "Mestre Zen, bloqueada" });
    expect(locked.querySelector("[data-locked='true']")).not.toBeNull();
    const open = screen.getByRole("button", { name: "Hiperfocado, desbloqueada" });
    expect(open.querySelector("[data-locked='true']")).toBeNull();
  });

  it("test_CollectionDetailLocked_bloqueado_mostra_como_ganhar_e_nao_oferece_foto", async () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    await userEvent.click(screen.getByRole("button", { name: "Mestre Zen, bloqueada" }));
    const dialog = screen.getByRole("dialog", { name: "Mestre Zen" });
    expect(within(dialog).getByText("Como ganhar")).toBeInTheDocument();
    expect(within(dialog).getByText("Corra com calma alta e foco estável do começo ao fim.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: /Tirar foto/ })).toBeNull();
  });

  it("test_CollectionDetailUnlocked_moldura_desbloqueada_mostra_metrica_data_SP_e_leva_a_selfie", async () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    await userEvent.click(screen.getByRole("button", { name: "Hiperfocado, desbloqueada" }));
    const dialog = screen.getByRole("dialog", { name: "Hiperfocado" });
    expect(within(dialog).getByText("Você ganhou")).toBeInTheDocument();
    expect(within(dialog).getByText("Foco médio de 70 · 29/09")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Tirar foto com esta moldura" })).toHaveAttribute(
      "href",
      "/dashboard/selfie?moldura=hiperfocado",
    );
  });

  it("test_CollectionDetailSticker_figurinha_desbloqueada_nao_oferece_foto", async () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    await userEvent.click(screen.getByRole("button", { name: "Largada Relâmpago, desbloqueada" }));
    const dialog = screen.getByRole("dialog", { name: "Largada Relâmpago" });
    expect(within(dialog).getByText("Foco de 70 no começo · 29/09")).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: /Tirar foto/ })).toBeNull();
  });

  it("test_CollectionDetailNav_setas_vao_ao_vizinho_e_Esc_fecha", async () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    await userEvent.click(screen.getByRole("button", { name: "Hiperfocado, desbloqueada" }));
    const dialog = screen.getByRole("dialog", { name: "Hiperfocado" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Arranque Crescente" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Hiperfocado" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("test_CollectionDetailClose_botao_Fechar_fecha_e_devolve_o_foco_ao_item", async () => {
    render(<CollectionTab unlocks={UNLOCKS} />);
    const item = screen.getByRole("button", { name: "Hiperfocado, desbloqueada" });
    await userEvent.click(item);
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(item).toHaveFocus();
  });
});
