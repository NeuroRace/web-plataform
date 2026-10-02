import type { CollectionItem } from "./catalog";

/**
 * Moldura da selfie desenhada por código (NEU-125). A MESMA função pinta a prévia ao vivo
 * e a foto final, então o que a pessoa vê é o que ela compartilha.
 * Sem apelido e sem data: logo, evento, nome da moldura e personagem.
 */

export const STORY_W = 1080;
export const STORY_H = 1920;

export interface FrameImages {
  character?: CanvasImageSource;
  logo?: CanvasImageSource;
}

const INK = "#0f1e2e";
const TEXT = "#eaf2f7";
const MUTED = "#c7d3df";
const ACCENT = "#5be3c8";
const FALLBACK_FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function size(img: CanvasImageSource): { w: number; h: number } {
  const i = img as { naturalWidth?: number; videoWidth?: number; width?: number; naturalHeight?: number; videoHeight?: number; height?: number };
  return {
    w: i.naturalWidth || i.videoWidth || Number(i.width) || 1,
    h: i.naturalHeight || i.videoHeight || Number(i.height) || 1,
  };
}

/** Desenha `img` inteiro dentro da caixa, sem distorcer. */
function drawContained(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const s = size(img);
  const k = Math.min(w / s.w, h / s.h);
  const dw = s.w * k;
  const dh = s.h * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Recorte "cover": a parte central da fonte que preenche W×H sem distorcer. */
export function coverRect(sw: number, sh: number, w: number, h: number) {
  const k = Math.max(w / sw, h / sh);
  const cw = w / k;
  const ch = h / k;
  return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch };
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  item: CollectionItem,
  images: FrameImages,
  w: number = STORY_W,
  h: number = STORY_H,
  fontFamily: string = FALLBACK_FONT,
): void {
  const s = w / STORY_W;
  const border = 36 * s;

  // Borda na cor da moldura.
  ctx.strokeStyle = item.color;
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, w - border, h - border);

  // Cabeçalho: logo, NEURORACE e o evento.
  const headH = 112 * s;
  ctx.fillStyle = "rgba(10, 21, 32, 0.82)";
  ctx.fillRect(border, border, w - 2 * border, headH);
  const logoSize = 68 * s;
  const logoX = border + 24 * s;
  if (images.logo) drawContained(ctx, images.logo, logoX, border + (headH - logoSize) / 2, logoSize, logoSize);
  const midY = border + headH / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `700 ${44 * s}px ${fontFamily}`;
  const wordX = logoX + logoSize + 16 * s;
  ctx.fillStyle = TEXT;
  ctx.fillText("NEURO", wordX, midY);
  ctx.fillStyle = ACCENT;
  ctx.fillText("RACE", wordX + ctx.measureText("NEURO").width, midY);
  ctx.font = `500 ${28 * s}px ${fontFamily}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText("NEXT FIAP 2026", w - border - 28 * s, midY);

  // Faixa de baixo com o nome da moldura.
  const bandH = 150 * s;
  const bandY = h - border - bandH;
  ctx.fillStyle = item.color;
  ctx.fillRect(border, bandY, w - 2 * border, bandH);
  const radius = 150 * s;
  const nameMax = w - 2 * border - 2 * radius - 72 * s;
  let fontPx = 64 * s;
  const label = item.name.toLocaleUpperCase("pt-BR");
  ctx.font = `700 ${fontPx}px ${fontFamily}`;
  while (ctx.measureText(label).width > nameMax && fontPx > 28 * s) {
    fontPx -= 4 * s;
    ctx.font = `700 ${fontPx}px ${fontFamily}`;
  }
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText(label, border + 36 * s, bandY + bandH / 2);

  // Personagem num círculo, no canto de baixo à direita, por cima da faixa.
  const cx = w - border - 40 * s - radius;
  const cy = bandY - 20 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.lineWidth = 12 * s;
  ctx.strokeStyle = item.color;
  ctx.stroke();
  if (images.character) {
    const box = radius * 1.55;
    drawContained(ctx, images.character, cx - box / 2, cy - box / 2, box, box);
  }
}

export interface ComposeInput {
  source: CanvasImageSource;
  sourceWidth: number;
  sourceHeight: number;
  /** Câmera frontal: a foto sai como a pessoa se viu na prévia. A moldura nunca espelha. */
  mirror: boolean;
  item: CollectionItem;
  images: FrameImages;
  fontFamily?: string;
  createCanvas?: () => HTMLCanvasElement;
}

/** Monta a foto 1080×1920 no próprio aparelho e devolve o PNG. Nada vai para a rede. */
export function composeStory(input: ComposeInput): Promise<Blob> {
  const canvas = (input.createCanvas ?? (() => document.createElement("canvas")))();
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas indisponível"));

  const r = coverRect(input.sourceWidth, input.sourceHeight, STORY_W, STORY_H);
  ctx.save();
  if (input.mirror) {
    ctx.translate(STORY_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(input.source, r.sx, r.sy, r.sw, r.sh, 0, 0, STORY_W, STORY_H);
  ctx.restore();
  drawFrame(ctx, input.item, input.images, STORY_W, STORY_H, input.fontFamily);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("não gerou a imagem"))), "image/png");
  });
}
