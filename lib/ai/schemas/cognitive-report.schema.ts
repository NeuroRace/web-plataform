import { z } from "zod";

/**
 * 1. Arquétipos Cognitivos definidos para o NeuroRace
 */
export const CognitiveArchetypeEnum = z.enum([
  "MESTRE_ZEN",
  "SPRINTER_EXPLOSIVO",
  "HIPERFOCADO_RESILIENTE",
  "REATIVO_SOB_PRESSAO",
  "OSCILADOR_CAOTICO",
  "EM_DESENVOLVIMENTO",
]).catch("EM_DESENVOLVIMENTO"); // Se o modelo inventar um arquétipo fora da lista, usa este como fallback

export type CognitiveArchetype = z.infer<typeof CognitiveArchetypeEnum>;

/**
 * 2. Badges Cognitivas Gamificadas
 */
export const CognitiveBadgeEnum = z.enum([
  "LARGADA_RELAMPAGO",
  "MENTE_DE_ACO",
  "RECUPERACAO_HEROICA",
  "ESTADO_DE_FLOW",
  "CONTROLE_EMOCIONAL",
  "FADIGA_ZERO",
]);

export type CognitiveBadge = z.infer<typeof CognitiveBadgeEnum>;

/**
 * 3. Exercício / Treino de Biofeedback Recomendado (Agora Flexível)
 */
export const ActionableDrillSchema = z.object({
  title: z.string().describe("Nome curto e impactante da técnica mental"),
  category: z.string().default("FOCO_SUSTENTADO").describe("Categoria da técnica (ex: RESPIRACAO, FOCO, RECUPERACAO, MEDITACAO)"),
  instruction: z.string().describe("Passo a passo prático de como executar"),
});

/**
 * 4. Schema de SAÍDA do LLM
 */
export const CognitiveReportOutputSchema = z.object({
  archetype: CognitiveArchetypeEnum,
  headline: z.string(),
  narrative_summary: z.string(),
  mental_strengths: z.array(z.string()).min(1),
  areas_for_improvement: z.array(z.string()).min(1),
  actionable_drills: z.array(ActionableDrillSchema).min(1),
  badges_unlocked: z.array(z.string()).default([]).transform((badges) => {
    // Filtra para garantir apenas badges conhecidas
    const validBadges: CognitiveBadge[] = [
      "LARGADA_RELAMPAGO",
      "MENTE_DE_ACO",
      "RECUPERACAO_HEROICA",
      "ESTADO_DE_FLOW",
      "CONTROLE_EMOCIONAL",
      "FADIGA_ZERO",
    ];
    return badges.filter((b): b is CognitiveBadge => validBadges.includes(b as CognitiveBadge));
  }),
  confidence_score: z.number().optional().default(0.9),
});

export type CognitiveReportOutput = z.infer<typeof CognitiveReportOutputSchema>;

/**
 * Gerador de Fallback Heurístico (permanece igual para contingência)
 */
export function generateFallbackReport(avgAttention: number, chokeDetected: boolean): CognitiveReportOutput {
  const isGoodFocus = avgAttention >= 60;

  return {
    archetype: chokeDetected
      ? "REATIVO_SOB_PRESSAO"
      : isGoodFocus
      ? "HIPERFOCADO_RESILIENTE"
      : "EM_DESENVOLVIMENTO",
    headline: chokeDetected
      ? "Bom início, mas oscilação nos momentos decisivos."
      : isGoodFocus
      ? "Foco sólido e consistente durante a prova."
      : "Sessão de adaptação ao biofeedback.",
    narrative_summary:
      "Sua telemetria cerebral foi registrada. O foco médio registrado foi de " +
      avgAttention.toFixed(0) +
      "%. Continue praticando para estabilizar suas ondas Beta durante momentos críticos da corrida.",
    mental_strengths: isGoodFocus
      ? ["Boa ativação na largada", "Atenção média sustentada"]
      : ["Participação e leitura de sinais concluída"],
    areas_for_improvement: [
      "Manter a respiração cadenciada nas retas",
      "Evitar dispersão visual durante a corrida",
    ],
    actionable_drills: [
      {
        title: "Técnica 4-4-4 (Box Breathing)",
        category: "RESPIRACAO",
        instruction: "Inspire em 4s, segure em 4s e expire em 4s antes de colocar o headset para a próxima largada.",
      },
    ],
    badges_unlocked: isGoodFocus ? ["ESTADO_DE_FLOW"] : [],
    confidence_score: 0.7,
  };
}