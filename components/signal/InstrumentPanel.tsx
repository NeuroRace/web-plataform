import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InstrumentPanel({
  title,
  live = false,
  children,
  className,
}: {
  title?: string;
  live?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface",
        className,
      )}
    >
      {(title || live) && (
        <div className="flex items-center justify-between border-b border-hairline px-3 py-2.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
          <span>{title}</span>
          {live && (
            <span className="flex items-center gap-1.5 text-attention">
              <span className="h-1.5 w-1.5 rounded-full bg-attention motion-safe:animate-pulse" />
              Ao vivo
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
