import { describe, expect, it } from "vitest";
import { FRAMES } from "./catalog";
import { STORY_H, STORY_W, composeStory, coverRect, drawFrame, type FrameImages } from "./frame";

type Call = { fn: string; args: unknown[] };

/** Contexto 2D falso: grava cada chamada e cada estilo usado. */
function fakeCtx() {
  const calls: Call[] = [];
  const styles = new Set<string>();
  const ctx = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "__calls") return calls;
        if (prop === "__styles") return styles;
        if (prop === "measureText") return (s: string) => ({ width: s.length * 10 });
        return (...args: unknown[]) => calls.push({ fn: prop, args });
      },
      set(_t, prop: string, value: unknown) {
        if ((prop === "fillStyle" || prop === "strokeStyle") && typeof value === "string") styles.add(value);
        calls.push({ fn: `set:${prop}`, args: [value] });
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D & { __calls: Call[]; __styles: Set<string> };
  return ctx;
}

const character = { id: "char" } as unknown as CanvasImageSource;
const logo = { id: "logo" } as unknown as CanvasImageSource;
const images: FrameImages = { character, logo };
const sprinter = FRAMES.find((f) => f.id === "sprinter")!;

describe("moldura desenhada por código (NEU-125)", () => {
  it("test_FrameContent_tem_logo_evento_nome_e_personagem_na_cor_do_arquetipo", () => {
    const ctx = fakeCtx();
    drawFrame(ctx, sprinter, images, STORY_W, STORY_H);
    const texts = ctx.__calls.filter((c) => c.fn === "fillText").map((c) => c.args[0]);
    expect(texts).toEqual(expect.arrayContaining(["NEURO", "RACE", "NEXT FIAP 2026", "SPRINTER"]));
    const drawn = ctx.__calls.filter((c) => c.fn === "drawImage").map((c) => c.args[0]);
    expect(drawn).toContain(character);
    expect(drawn).toContain(logo);
    expect(ctx.__styles.has(sprinter.color)).toBe(true);
  });

  it("test_FrameNoPII_so_escreve_os_textos_da_moldura", () => {
    const ctx = fakeCtx();
    drawFrame(ctx, sprinter, images, STORY_W, STORY_H);
    const texts = ctx.__calls.filter((c) => c.fn === "fillText").map((c) => c.args[0]);
    expect(texts.sort()).toEqual(["NEURO", "NEXT FIAP 2026", "RACE", "SPRINTER"].sort());
  });

  it("test_FrameWithoutArt_desenha_sem_quebrar_quando_a_imagem_ainda_nao_carregou", () => {
    const ctx = fakeCtx();
    expect(() => drawFrame(ctx, sprinter, {}, 540, 960)).not.toThrow();
    expect(ctx.__calls.some((c) => c.fn === "drawImage")).toBe(false);
  });

  it("test_CoverCrop_corta_a_foto_sem_distorcer_para_9x16", () => {
    // Webcam 16:9 (1280×720) em 9:16: usa toda a altura e o centro da largura.
    expect(coverRect(1280, 720, 1080, 1920)).toEqual({ sx: 437.5, sy: 0, sw: 405, sh: 720 });
    // Foto em pé mais alta que 9:16: usa toda a largura e o centro da altura.
    expect(coverRect(900, 2000, 1080, 1920)).toEqual({ sx: 0, sy: 200, sw: 900, sh: 1600 });
  });

  it("test_ComposeLocal_monta_1080x1920_espelhado_e_devolve_png_sem_rede", async () => {
    const ctx = fakeCtx();
    const blob = new Blob(["png"], { type: "image/png" });
    let size: [number, number] | null = null;
    let type: string | null = null;
    const canvas = {
      set width(v: number) {
        size = [v, size?.[1] ?? 0];
      },
      set height(v: number) {
        size = [size?.[0] ?? 0, v];
      },
      getContext: () => ctx,
      toBlob: (cb: (b: Blob | null) => void, t: string) => {
        type = t;
        cb(blob);
      },
    } as unknown as HTMLCanvasElement;
    const photo = { id: "photo" } as unknown as CanvasImageSource;

    const out = await composeStory({
      source: photo,
      sourceWidth: 1280,
      sourceHeight: 720,
      mirror: true,
      item: sprinter,
      images,
      createCanvas: () => canvas,
    });

    expect(out).toBe(blob);
    expect(size).toEqual([1080, 1920]);
    expect(type).toBe("image/png");
    const scale = ctx.__calls.find((c) => c.fn === "scale");
    expect(scale?.args).toEqual([-1, 1]);
    const first = ctx.__calls.find((c) => c.fn === "drawImage");
    expect(first?.args[0]).toBe(photo);
  });
});
