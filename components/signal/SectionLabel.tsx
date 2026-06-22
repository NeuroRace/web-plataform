import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: number | string;
  children: ReactNode;
  className?: string;
}) {
  const prefix =
    index === undefined
      ? null
      : typeof index === "number"
        ? String(index).padStart(2, "0")
        : index;
  return (
    <p
      className={cn(
        "font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-fg-muted",
        className,
      )}
    >
      {prefix && <span className="text-attention">{prefix} — </span>}
      {children}
    </p>
  );
}
