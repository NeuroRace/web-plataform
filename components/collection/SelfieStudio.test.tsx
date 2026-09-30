import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  compose: vi.fn(),
  shareOrDownload: vi.fn(),
  download: vi.fn(),
  loadImage: vi.fn(),
  loadImageFromFile: vi.fn(),
}));

// O canvas não existe no jsdom: a montagem é testada em lib/collection/frame.test.ts.
vi.mock("@/lib/collection/frame", async (orig) => ({
  ...(await orig<typeof import("@/lib/collection/frame")>()),
  composeStory: mocks.compose,
  drawFrame: vi.fn(),
}));
vi.mock("@/lib/collection/media", () => ({
  loadImage: mocks.loadImage,
  loadImageFromFile: mocks.loadImageFromFile,
  shareOrDownload: mocks.shareOrDownload,
  download: mocks.download,
}));

import { SelfieStudio } from "./SelfieStudio";

// O jsdom não tem PointerEvent: sem isto o fireEvent.pointer* chega sem clientX.
if (!("PointerEvent" in window)) {
  // @ts-expect-error shim de teste
  window.PointerEvent = class PointerEvent extends MouseEvent {};
}

const FRAMES = ["neurorace", "em-aquecimento", "sprinter", "hiperfocado"];
// Um stream por teste: o desmonte de um teste não pode contar no seguinte.
let stop: ReturnType<typeof vi.fn>;
let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  mocks.loadImage.mockResolvedValue({});
  mocks.compose.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderLive(initialId = "sprinter") {
  render(<SelfieStudio frameIds={FRAMES} initialId={initialId} />);
  await waitFor(() => expect(screen.getByRole("button", { name: /^Tirar foto com a moldura/ })).toBeInTheDocument());
}

describe("selfie com moldura (NEU-125)", () => {
  it("test_CameraFront_pede_so_a_camera_frontal_sem_audio", async () => {
    await renderLive();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "user" }, audio: false });
  });

  it("test_CarouselInitial_comeca_na_moldura_pedida_com_as_vizinhas_dos_lados", async () => {
    await renderLive("sprinter");
    expect(screen.getByRole("button", { name: "Tirar foto com a moldura Sprinter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Moldura anterior: Em Aquecimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima moldura: Hiperfocado" })).toBeInTheDocument();
  });

  it("test_CarouselInfinite_gira_sem_fim_pelas_laterais_e_pelas_setas", async () => {
    await renderLive("hiperfocado");
    await userEvent.click(screen.getByRole("button", { name: "Próxima moldura: NeuroRace" }));
    expect(screen.getByRole("button", { name: "Tirar foto com a moldura NeuroRace" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Tirar foto com a moldura Hiperfocado" })).toBeInTheDocument();
  });

  it("test_CarouselSwipe_arrastar_para_a_esquerda_vai_para_a_proxima", async () => {
    await renderLive("sprinter");
    const stage = screen.getByTestId("selfie-stage");
    fireEvent.pointerDown(stage, { clientX: 300 });
    fireEvent.pointerUp(stage, { clientX: 180 });
    expect(screen.getByRole("button", { name: "Tirar foto com a moldura Hiperfocado" })).toBeInTheDocument();
  });

  it("test_CaptureLocal_a_bolinha_do_meio_monta_a_foto_no_aparelho_sem_rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderLive("sprinter");
    expect(stop).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Tirar foto com a moldura Sprinter" }));
    await waitFor(() => expect(screen.getByRole("img", { name: "Sua foto com a moldura Sprinter" })).toBeInTheDocument());
    expect(mocks.compose).toHaveBeenCalledWith(
      expect.objectContaining({ mirror: true, item: expect.objectContaining({ id: "sprinter" }) }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it("test_PreviewActions_compartilhar_baixar_e_tirar_de_novo", async () => {
    await renderLive("sprinter");
    await userEvent.click(screen.getByRole("button", { name: "Tirar foto com a moldura Sprinter" }));
    await screen.findByRole("img", { name: "Sua foto com a moldura Sprinter" });
    await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(mocks.shareOrDownload).toHaveBeenCalledWith(expect.any(Blob), "neurorace-sprinter.png");
    await userEvent.click(screen.getByRole("button", { name: "Baixar" }));
    expect(mocks.download).toHaveBeenCalledWith(expect.any(Blob), "neurorace-sprinter.png");
    await userEvent.click(screen.getByRole("button", { name: "Tirar de novo" }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  });

  it("test_CameraDenied_mostra_aviso_e_oferece_a_galeria", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("negado"), { name: "NotAllowedError" }));
    render(<SelfieStudio frameIds={FRAMES} initialId="sprinter" />);
    expect(await screen.findByText("Sem acesso à câmera")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher da galeria" })).toBeInTheDocument();
  });

  it("test_CameraMissing_navegador_sem_camera_cai_no_mesmo_aviso", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    render(<SelfieStudio frameIds={FRAMES} initialId="sprinter" />);
    expect(await screen.findByText("Sem acesso à câmera")).toBeInTheDocument();
  });

  it("test_GalleryCompose_foto_da_galeria_vira_a_mesma_composicao_sem_espelhar", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("negado"), { name: "NotAllowedError" }));
    const photo = { width: 900, height: 1600 };
    mocks.loadImageFromFile.mockResolvedValue(photo);
    render(<SelfieStudio frameIds={FRAMES} initialId="sprinter" />);
    await screen.findByText("Sem acesso à câmera");
    const input = screen.getByLabelText("Escolher da galeria", { selector: "input" });
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await screen.findByRole("img", { name: "Sua foto com a moldura Sprinter" });
    expect(mocks.compose).toHaveBeenCalledWith(
      expect.objectContaining({ source: photo, sourceWidth: 900, sourceHeight: 1600, mirror: false }),
    );
  });
});
