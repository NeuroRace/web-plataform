import { cn } from "@/lib/utils";

/** Divisor de seção em forma de sinal (linha viva fina). */
export function SignalDivider({ className }: { className?: string }) {
  return (
    <div role="separator" aria-hidden className={cn("w-full", className)}>
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="h-3 w-full"
      >
        <path
          d="M0 12 H420 l18 -8 l24 16 l20 -22 l18 14 H1200"
          fill="none"
          stroke="var(--color-attention)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
          pathLength={1}
          className="animate-signal-draw"
        />
      </svg>
    </div>
  );
}
