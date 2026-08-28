import type { CognitiveArchetype } from "@/lib/ai/types";

const ARCHETYPE_CONFIG: Record<
  CognitiveArchetype,
  { label: string; bg: string; border: string; text: string; glow: string }
> = {
  MESTRE_ZEN: {
    label: "Mestre Zen",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  HIPERFOCADO_RESILIENTE: {
    label: "Hiperfocado Resiliente",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    glow: "shadow-cyan-500/20",
  },
  SPRINTER_EXPLOSIVO: {
    label: "Sprinter Explosivo",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    glow: "shadow-amber-500/20",
  },
  REATIVO_SOB_PRESSAO: {
    label: "Reativo sob Pressão",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    glow: "shadow-rose-500/20",
  },
  OSCILADOR_CAOTICO: {
    label: "Oscilador Caótico",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-400",
    glow: "shadow-purple-500/20",
  },
  EM_DESENVOLVIMENTO: {
    label: "Em Desenvolvimento",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    text: "text-zinc-400",
    glow: "shadow-zinc-500/20",
  },
};

export function ArchetypeBadge({ archetype }: { archetype: CognitiveArchetype }) {
  const config = ARCHETYPE_CONFIG[archetype] ?? ARCHETYPE_CONFIG.EM_DESENVOLVIMENTO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border shadow-sm ${config.bg} ${config.border} ${config.text} ${config.glow}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {config.label}
    </span>
  );
}