"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { findItem, type CollectionItem } from "@/lib/collection/catalog";
import { composeStory, drawFrame, type FrameImages } from "@/lib/collection/frame";
import { download, loadImage, loadImageFromFile, shareOrDownload } from "@/lib/collection/media";
import { cn } from "@/lib/utils";

type Phase = "starting" | "live" | "denied" | "preview";

const LOGO = "/assets/images/logo-icon.png";
const SWIPE_PX = 40;

function displayFont(): string {
  const v = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue("--font-space-grotesk").trim();
  return `${v ? `${v}, ` : ""}system-ui, -apple-system, "Segoe UI", sans-serif`;
}

/**
 * Selfie com moldura (NEU-125): câmera frontal com a moldura por cima, carrossel das molduras
 * desbloqueadas e a foto montada no próprio aparelho. Nada da imagem vai para a rede.
 */
export function SelfieStudio({ frameIds, initialId }: { frameIds: string[]; initialId: string }) {
  const frames = frameIds.map(findItem).filter((i): i is CollectionItem => Boolean(i));
  const [index, setIndex] = useState(() => Math.max(0, frames.findIndex((f) => f.id === initialId)));
  const [phase, setPhase] = useState<Phase>("starting");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; item: CollectionItem } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, CanvasImageSource>>({});
  // Sem o 1º quadro do vídeo a foto sairia só com a moldura (celular lento): o botão espera.
  const [hasFrame, setHasFrame] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const swipeX = useRef<number | null>(null);
  // Cada pedido de câmera tem um número; sair da página ou pedir de novo invalida os anteriores.
  const request = useRef(0);

  const n = frames.length;
  const current = frames[index] ?? frames[0];
  const prev = frames[(index - 1 + n) % n];
  const next = frames[(index + 1) % n];

  const stopCamera = useCallback(() => {
    request.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    const id = ++request.current;
    setError(null);
    setHasFrame(false);
    setPhase("starting");
    const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setPhase("denied");
      return;
    }
    try {
      const stream = await media.getUserMedia({ video: { facingMode: "user" }, audio: false });
      // A permissão pode chegar depois que a pessoa saiu ou pediu de novo: desliga na hora.
      if (id !== request.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setPhase("live");
    } catch {
      if (id === request.current) setPhase("denied");
    }
  }, []);

  // Liga a câmera ao abrir a página e solta ao sair.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a câmera é um sistema externo: sincroniza ao montar.
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // O vídeo só existe na tela depois do setPhase: liga o stream a ele aqui.
  useEffect(() => {
    const video = videoRef.current;
    if (phase !== "live" || !video || !streamRef.current) return;
    if (video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);
    const ready = () => setHasFrame(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    ready();
    video.addEventListener("loadeddata", ready);
    return () => video.removeEventListener("loadeddata", ready);
  }, [phase]);

  // Carrega o logo e os personagens (uma vez cada).
  useEffect(() => {
    let alive = true;
    const wanted = [LOGO, ...frames.map((f) => f.art)];
    Promise.all(wanted.map((src) => loadImage(src).then((img) => [src, img] as const).catch(() => null))).then((loaded) => {
      if (!alive) return;
      setImages(Object.fromEntries(loaded.filter((x): x is readonly [string, HTMLImageElement] => x !== null)));
    });
    return () => {
      alive = false;
    };
    // frameIds é a identidade estável da lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameIds.join(",")]);

  const frameImages = useCallback(
    (item: CollectionItem): FrameImages => ({ character: images[item.art], logo: images[LOGO] }),
    [images],
  );

  // Moldura por cima do vídeo: a mesma função que monta a foto final.
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !current) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFrame(ctx, current, frameImages(current), canvas.width, canvas.height, displayFont());
    };
    paint();
    void document.fonts?.ready.then(paint);
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [current, frameImages, phase]);

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + n) % n), [n]);

  const finish = useCallback(
    async (source: CanvasImageSource, width: number, height: number, mirror: boolean) => {
      try {
        const blob = await composeStory({
          source,
          sourceWidth: width,
          sourceHeight: height,
          mirror,
          item: current,
          images: frameImages(current),
          fontFamily: displayFont(),
        });
        stopCamera();
        setPhoto({ blob, url: URL.createObjectURL(blob), item: current });
        setPhase("preview");
      } catch {
        setError("Não deu para montar a foto. Tente de novo.");
      }
    },
    [current, frameImages, stopCamera],
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !hasFrame) return;
    void finish(video, video.videoWidth || 720, video.videoHeight || 1280, true);
  }, [finish, hasFrame]);

  // Teclado no PC: setas trocam a moldura, espaço tira a foto.
  useEffect(() => {
    if (phase !== "live") return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === " " && tag !== "BUTTON" && tag !== "A" && tag !== "INPUT") {
        e.preventDefault();
        capture();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, go, capture]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function onGallery(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await loadImageFromFile(file);
      await finish(img, img.naturalWidth || img.width, img.naturalHeight || img.height, false);
    } catch {
      setError("Não deu para abrir essa foto. Tente outra.");
    }
  }

  function retake() {
    setPhoto(null);
    void startCamera();
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    swipeX.current = e.clientX;
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (swipeX.current === null) return;
    const dx = e.clientX - swipeX.current;
    swipeX.current = null;
    if (dx <= -SWIPE_PX) go(1);
    else if (dx >= SWIPE_PX) go(-1);
  }

  if (!current) return null;

  const fileName = `neurorace-${photo?.item.id ?? current.id}.png`;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard?tab=colecao"
          className="flex min-h-11 items-center gap-2 rounded-lg text-sm text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-attention"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Voltar para a coleção
        </Link>
        {phase === "live" && (
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-fg outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-attention"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-9 9" />
            </svg>
            Galeria
          </button>
        )}
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        aria-label="Escolher da galeria"
        className="sr-only"
        tabIndex={-1}
        onChange={onGallery}
      />

      {error && (
        <p role="alert" className="rounded-lg bg-meditation/15 px-3 py-2 text-sm text-fg">
          {error}
        </p>
      )}

      {phase === "preview" && photo ? (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob local, não passa pelo otimizador */}
          <img
            src={photo.url}
            alt={`Sua foto com a moldura ${photo.item.name}`}
            className="mx-auto aspect-[9/16] h-[min(calc(100dvh-19rem),calc((100vw-2rem)*16/9))] max-w-full rounded-2xl object-cover"
          />
          <button
            type="button"
            onClick={() => void shareOrDownload(photo.blob, fileName)}
            className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-attention px-4 py-3 font-display text-lg font-bold text-bg outline-none focus-visible:ring-2 focus-visible:ring-fg-strong"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />
            </svg>
            Compartilhar
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => download(photo.blob, fileName)}
              className="min-h-12 rounded-xl border border-border bg-bg-elev font-semibold text-fg outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-attention"
            >
              Baixar
            </button>
            <button
              type="button"
              onClick={retake}
              className="min-h-12 rounded-xl border border-border bg-bg-elev font-semibold text-fg outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-attention"
            >
              Tirar de novo
            </button>
          </div>
        </div>
      ) : phase === "denied" ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-bg-elev px-6 py-10 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M3 3l18 18" />
            </svg>
          </span>
          <h1 className="font-display text-2xl font-bold text-fg-strong">Sem acesso à câmera</h1>
          <p className="max-w-xs text-fg-muted">
            Você pode liberar a câmera nas configurações do navegador ou usar uma foto da galeria.
          </p>
          <p className="max-w-xs text-sm text-fg-muted/80">A foto fica no seu aparelho até você compartilhar.</p>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="min-h-13 w-full rounded-xl bg-attention px-4 py-3 font-display text-lg font-bold text-bg outline-none focus-visible:ring-2 focus-visible:ring-fg-strong"
          >
            Escolher da galeria
          </button>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="min-h-12 w-full rounded-xl border border-border font-semibold text-fg outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-attention"
          >
            Tentar a câmera de novo
          </button>
        </div>
      ) : (
        <>
          <div
            data-testid="selfie-stage"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            className="relative mx-auto aspect-[9/16] h-[min(calc(100dvh-19rem),calc((100vw-2rem)*16/9))] max-w-full touch-pan-y select-none overflow-hidden rounded-2xl bg-surface"
          >
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Prévia da câmera frontal"
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
            />
            <canvas ref={overlayRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
            {phase === "starting" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-muted">Abrindo a câmera…</p>
            )}
          </div>

          {phase === "live" && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-6">
                {n > 1 && <CarouselDot item={prev} size="side" label={`Moldura anterior: ${prev.name}`} onClick={() => go(-1)} />}
                <CarouselDot item={current} size="center" label={`Tirar foto com a moldura ${current.name}`} onClick={capture} disabled={!hasFrame} />
                {n > 1 && <CarouselDot item={next} size="side" label={`Próxima moldura: ${next.name}`} onClick={() => go(1)} />}
              </div>
              <div className="grid w-full max-w-xs grid-cols-3 items-baseline text-center">
                <span className="truncate text-xs text-fg-muted">{n > 1 ? prev.name : ""}</span>
                <span className="font-display text-[15px] font-bold text-fg-strong">{current.name}</span>
                <span className="truncate text-xs text-fg-muted">{n > 1 ? next.name : ""}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CarouselDot({
  item,
  size,
  label,
  onClick,
  disabled = false,
}: {
  item: CollectionItem;
  size: "side" | "center";
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const center = size === "center";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: `${item.color}40`,
        borderColor: center ? "#ffffff" : item.color,
        boxShadow: center ? `0 0 0 3px ${item.color}` : undefined,
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-wait disabled:opacity-50",
        center ? "h-20 w-20 border-[5px]" : "h-14 w-14 border-2",
      )}
    >
      <Image src={item.art} alt="" width={64} height={58} className={cn("object-contain", center ? "w-12" : "w-8")} />
    </button>
  );
}
