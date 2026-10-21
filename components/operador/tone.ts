import type { Tone } from "@/lib/operador";

/** Cor de cada tom: texto e borda da linha. Vermelho só para o que pede ação agora. */
export const TONE: Record<Tone, string> = {
  ok: "text-attention border-attention/40",
  wait: "text-cyan border-cyan/40",
  alert: "text-danger border-danger/70",
  warn: "text-meditation border-meditation/50",
  done: "text-gold border-gold/40",
  muted: "text-fg-muted border-border",
};
