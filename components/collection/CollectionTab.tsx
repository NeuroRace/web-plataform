"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { COLLECTION, FRAMES, STICKERS, TOTAL_ITEMS, type CollectionItem } from "@/lib/collection/catalog";
import { formatUnlockDate, type Unlock } from "@/lib/collection/unlocks";
import { cn } from "@/lib/utils";

/** Aba Coleção do painel (NEU-134): molduras e figurinhas que a pessoa desbloqueia jogando. */
export function CollectionTab({ unlocks }: { unlocks: Unlock[] }) {
  const byId = new Map(unlocks.map((u) => [u.id, u]));
  const [openId, setOpenId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const count = COLLECTION.filter((i) => byId.has(i.id)).length;

  function close() {
    const id = openId;
    setOpenId(null);
    if (id) itemRefs.current.get(id)?.focus();
  }

  const open = openId ? COLLECTION.find((i) => i.id === openId) : undefined;

  return (
    <section aria-labelledby="colecao-titulo" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="colecao-titulo" className="font-display text-2xl font-bold text-fg-strong">
          Minha coleção
        </h2>
        <p className="font-mono text-sm text-fg-muted">
          {count} de {TOTAL_ITEMS}
        </p>
      </div>

      <Strip
        title="Molduras"
        items={FRAMES}
        byId={byId}
        itemRefs={itemRefs}
        onOpen={setOpenId}
        renderArt={(item, locked) => <FrameTile item={item} locked={locked} />}
      />
      <Strip
        title="Figurinhas"
        items={STICKERS}
        byId={byId}
        itemRefs={itemRefs}
        onOpen={setOpenId}
        renderArt={(item, locked) => <StickerTile item={item} locked={locked} />}
      />

      {open && <Detail item={open} unlock={byId.get(open.id)} onClose={close} onMove={setOpenId} />}
    </section>
  );
}

function Strip({
  title,
  items,
  byId,
  itemRefs,
  onOpen,
  renderArt,
}: {
  title: string;
  items: CollectionItem[];
  byId: Map<string, Unlock>;
  itemRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  onOpen: (id: string) => void;
  renderArt: (item: CollectionItem, locked: boolean) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-fg-muted">{title}</h3>
      <ul
        aria-label={title}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0"
      >
        {items.map((item) => {
          const locked = !byId.has(item.id);
          return (
            <li key={item.id} className="shrink-0 snap-start">
              <button
                type="button"
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                aria-label={`${item.name}, ${locked ? "bloqueada" : "desbloqueada"}`}
                onClick={() => onOpen(item.id)}
                className="group flex flex-col items-center gap-2 rounded-xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-attention"
              >
                {renderArt(item, locked)}
                <span
                  className={cn(
                    "max-w-28 text-center text-[13px] font-semibold leading-tight sm:max-w-36",
                    locked ? "text-fg-muted/60" : "text-fg",
                  )}
                >
                  {item.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LockBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg",
        className,
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-fg-muted">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    </span>
  );
}

/** Miniatura da moldura no formato do Stories. */
function FrameTile({ item, locked, large = false }: { item: CollectionItem; locked: boolean; large?: boolean }) {
  return (
    <span className={cn("relative block", large ? "h-[235px] w-[132px] sm:h-[338px] sm:w-[190px]" : "h-[199px] w-[112px] sm:h-[249px] sm:w-[140px]")}>
      <span
        data-locked={locked ? "true" : undefined}
        style={{ borderColor: item.color }}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-2xl border-4 bg-bg-elev transition",
          locked && "opacity-40 grayscale",
        )}
      >
        <span className="px-2.5 pt-2 font-display text-[9px] font-bold tracking-wider text-fg-strong">
          NEURO<span className="text-attention">RACE</span>
        </span>
        <span className="flex flex-1 items-center justify-center">
          <span
            className="flex aspect-square w-3/4 items-center justify-center rounded-full"
            style={{ backgroundColor: `${item.color}33` }}
          >
            <Image src={item.art} alt="" width={120} height={108} className="h-auto w-4/5 object-contain" />
          </span>
        </span>
        <span
          className="truncate px-2 py-1.5 text-center font-display text-[10px] font-bold uppercase tracking-wide text-bg"
          style={{ backgroundColor: item.color }}
        >
          {item.name}
        </span>
      </span>
      {locked && <LockBadge className="right-2 top-2" />}
    </span>
  );
}

function StickerTile({ item, locked, large = false }: { item: CollectionItem; locked: boolean; large?: boolean }) {
  return (
    <span className={cn("relative block", large ? "h-32 w-32 sm:h-44 sm:w-44" : "h-[84px] w-[84px] sm:h-[100px] sm:w-[100px]")}>
      <span data-locked={locked ? "true" : undefined} className={cn("block h-full w-full transition", locked && "opacity-40 grayscale")}>
        <Image src={item.art} alt="" width={200} height={200} className="h-full w-full object-contain" />
      </span>
      {locked && <LockBadge className="-bottom-0.5 -right-0.5" />}
    </span>
  );
}

function unlockLine(unlock: Unlock): string {
  if (!unlock.at) return "Vem com a sua conta.";
  const date = formatUnlockDate(unlock.at);
  return unlock.metric ? `${unlock.metric} · ${date}` : `Desde ${date}`;
}

function Detail({
  item,
  unlock,
  onClose,
  onMove,
}: {
  item: CollectionItem;
  unlock: Unlock | undefined;
  onClose: () => void;
  onMove: (id: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const locked = !unlock;
  const titleId = `colecao-item-${item.id}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [item.id]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const list = item.kind === "frame" ? FRAMES : STICKERS;
      const idx = list.findIndex((i) => i.id === item.id) + (e.key === "ArrowRight" ? 1 : -1);
      if (idx >= 0 && idx < list.length) {
        e.preventDefault();
        onMove(list[idx].id);
      }
      return;
    }
    if (e.key === "Tab" && dialogRef.current) {
      // Foco preso no painel enquanto ele está aberto.
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-hidden="true" tabIndex={-1} className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex w-full flex-col items-center gap-4 rounded-t-3xl border-t border-hairline bg-bg-elev px-6 pb-7 pt-3 outline-none sm:max-w-xl sm:flex-row sm:items-center sm:gap-7 sm:rounded-3xl sm:border sm:p-8"
      >
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="shrink-0">
          {item.kind === "frame" ? <FrameTile item={item} locked={locked} large /> : <StickerTile item={item} locked={locked} large />}
        </div>
        <div className="flex w-full flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
              locked ? "bg-surface text-fg-muted" : "bg-attention/15 text-attention",
            )}
          >
            {locked ? "Bloqueada" : "Desbloqueada"}
          </span>
          <h3 id={titleId} className="font-display text-2xl font-bold text-fg-strong sm:text-3xl">
            {item.name}
          </h3>
          <p className="max-w-xs text-base leading-relaxed text-fg-muted">{item.meaning}</p>
          <div className="w-full rounded-xl bg-bg px-4 py-3 text-left">
            <p className="text-xs uppercase tracking-[0.1em] text-fg-muted">{locked ? "Como ganhar" : "Você ganhou"}</p>
            <p className="mt-1 text-[15px] text-fg">{locked ? item.how : unlockLine(unlock)}</p>
          </div>
          {!locked && item.kind === "frame" && (
            <Link
              href={`/dashboard/selfie?moldura=${item.id}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-attention px-4 font-display font-bold text-bg outline-none focus-visible:ring-2 focus-visible:ring-fg-strong"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Tirar foto com esta moldura
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-4 text-sm text-fg-muted outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-attention"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
