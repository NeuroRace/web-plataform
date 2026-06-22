import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const valueColor = {
  attention: "text-attention",
  meditation: "text-meditation",
  neutral: "text-fg-strong",
} as const;

export function Readout({
  label,
  value,
  kind = "neutral",
  suffix,
  className,
}: {
  label: string;
  value: ReactNode;
  kind?: "attention" | "meditation" | "neutral";
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
        {label}
      </span>
      <span className={cn("font-display text-2xl font-bold leading-none", valueColor[kind])}>
        {value}
        {suffix && <span className="ml-0.5 text-base font-medium text-fg-muted">{suffix}</span>}
      </span>
    </div>
  );
}
