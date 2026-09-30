import { afterEach, describe, expect, it, vi } from "vitest";
import { shareOrDownload } from "./media";

const blob = new Blob(["png"], { type: "image/png" });

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
});

describe("compartilhar ou baixar a imagem (NEU-125)", () => {
  it("test_ShareFile_usa_o_menu_do_celular_com_o_arquivo_quando_existe", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    await shareOrDownload(blob, "neurorace-sprinter.png");
    const arg = share.mock.calls[0][0] as { files: File[] };
    expect(arg.files[0].name).toBe("neurorace-sprinter.png");
    expect(arg.files[0].type).toBe("image/png");
  });

  it("test_ShareFallback_sem_Web_Share_de_arquivo_baixa_a_imagem", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await shareOrDownload(blob, "neurorace-sprinter.png");
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("test_ShareAbort_fechar_o_menu_nao_e_erro", async () => {
    const abort = Object.assign(new Error("cancelou"), { name: "AbortError" });
    Object.defineProperty(navigator, "share", { value: vi.fn().mockRejectedValue(abort), configurable: true });
    Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
    await expect(shareOrDownload(blob, "x.png")).resolves.toBeUndefined();
  });
});
