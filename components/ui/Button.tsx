import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-display font-medium tracking-wide transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-attention disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-attention text-bg shadow-[0_0_20px_rgba(91,227,200,0.15)] hover:shadow-[0_0_30px_rgba(91,227,200,0.3)] hover:-translate-y-1",
  secondary:
    "border border-white/15 bg-transparent text-fg hover:bg-white/5 hover:text-fg-strong hover:border-white/30 hover:-translate-y-1",
  ghost: "text-fg hover:text-fg-strong hover:bg-white/5",
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
