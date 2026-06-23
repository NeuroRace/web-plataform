import type { CSSProperties, ReactNode } from "react";
import { SectionLabel } from "@/components/signal/SectionLabel";
import { cn } from "@/lib/utils";

const toneStyle: Record<"noise" | "transition" | "signal", CSSProperties> = {
  noise: { background: "var(--color-bg)" },
  transition: {
    background:
      "linear-gradient(180deg, var(--color-bg), color-mix(in srgb, var(--color-attention) 8%, var(--color-bg)))",
  },
  signal: {
    background: "color-mix(in srgb, var(--color-attention) 4%, var(--color-bg))",
  },
};

/** Cena tela-cheia do scroll cinematográfico de /sobre. Contador sticky + label + fundo opcional. */
export function CinematicSection({
  index,
  total = 6,
  label,
  tone = "signal",
  background,
  children,
  className,
}: {
  index: number;
  total?: number;
  label: string;
  tone?: "noise" | "transition" | "signal";
  background?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const counter = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  return (
    <section
      style={toneStyle[tone]}
      className={cn(
        "relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-20 sm:px-8",
        className,
      )}
    >
      {background ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {background}
        </div>
      ) : null}
      <div className="pointer-events-none sticky top-4 z-10 mb-8 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-fg-muted">
        {counter}
      </div>
      <div className="relative z-[1] mx-auto w-full max-w-3xl">
        <SectionLabel>{label}</SectionLabel>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
