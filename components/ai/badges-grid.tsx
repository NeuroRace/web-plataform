import type { CognitiveBadge } from "@/lib/ai/types";

const BADGE_LABELS: Record<CognitiveBadge, { title: string; icon: string; desc: string }> = {
  LARGADA_RELAMPAGO: { title: "Largada Relâmpago", icon: "⚡", desc: "Foco explosivo (>80) no início" },
  MENTE_DE_ACO: { title: "Mente de Aço", icon: "🛡️", desc: "Estabilidade neural impecável" },
  RECUPERACAO_HEROICA: { title: "Virada Mental", icon: "🔄", desc: "Recuperação de foco após queda" },
  ESTADO_DE_FLOW: { title: "Modo Flow", icon: "🌊", desc: "Equilíbrio sustentado entre foco e calma" },
  CONTROLE_EMOCIONAL: { title: "Controle Emocional", icon: "🧘", desc: "Meditação alta sob pressão" },
  FADIGA_ZERO: { title: "Fadiga Zero", icon: "🔋", desc: "Manteve o ritmo mental até a reta final" },
};

export function BadgesGrid({ badges }: { badges: CognitiveBadge[] }) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {badges.map((b) => {
        const info = BADGE_LABELS[b] ?? { title: b, icon: "🎖️", desc: "" };
        return (
          <div
            key={b}
            title={info.desc}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-zinc-200 text-xs font-medium hover:border-cyan-500/40 transition-colors"
          >
            <span className="text-sm">{info.icon}</span>
            <span>{info.title}</span>
          </div>
        );
      })}
    </div>
  );
}