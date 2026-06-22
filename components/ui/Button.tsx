import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-display font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-brand text-bg hover:-translate-y-0.5 hover:glow-cyan",
  secondary:
    "border border-border bg-card/40 text-fg-strong hover:border-cyan hover:text-cyan",
  ghost: "text-fg hover:text-fg-strong",
};

/** Classe utilitária para estilizar <button> nativos (forms, ações). */
export function buttonClass(variant: Variant = "primary", className = "") {
  return cn(base, variants[variant], className);
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
};

/** CTA como link estilizado. */
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
