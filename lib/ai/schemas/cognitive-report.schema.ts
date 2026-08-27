import { z } from "zod";

/**
 * 1. Arquétipos Cognitivos definidos para o NeuroRace
 */
export const CognitiveArchetypeEnum = z.enum([
  "MESTRE_ZEN",             // Alta estabilidade, meditação alta, foco constante
  "SPRINTER_EXPLOSIVO",     // Foco altíssimo no início, queda por fadiga no final
  "HIPERFOCADO_RESILIENTE", // Foco alto e sustentado, não se abala com pressão
  "REATIVO_SOB_PRESSAO",    // Sofre com ultrapassagens / instabilidade alta (Choke)
  "OSCILADOR_CAOTICO",      // Variação constante e imprevisível de atenção
  "EM_DESENVOLVIMENTO",     // Níveis gerais baixos, precisando de treino de base
]);

export type CognitiveArchetype = z.infer<typeof CognitiveArchetypeEnum>;

/**
 * 2. Badges Cognitivas Gamificadas
 */
export const CognitiveBadgeEnum = z.enum([
  "LARGADA_RELAMPAGO",      // Atenção > 80 nos primeiros 10s
  "MENTE_DE_ACO",           // Baixo desvio padrão (< 15) durante toda a prova
  "RECUPERACAO_HEROICA",    // Recuperou mais de 30 pontos de atenção após uma queda
  "ESTADO_DE_FLOW",         // Flow score > 60%
  "CONTROLE_EMOCIONAL",     // Meditação > 50 mesmo durante ultrapassagens
  "FADIGA_ZERO",            // Manteve atenção alta até o último segundo
]);

export type CognitiveBadge = z.infer<typeof CognitiveBadgeEnum>;

/**
 * 3. Exercício / Treino de Biofeedback Recomendado
 */
export const ActionableDrillSchema = z.object({
  title: z.string().describe("Nome curto e impactante da técnica mental"),
  category: z.enum(["RESPIRACAO", "FOCO_SUSTENTADO", "RECUPERACAO_RAPIDA", "DESCONEXAO_ESTRESSE"]),
  instruction: z.string().describe("Passo a passo prático de 1 a 2 frases de como executar antes da próxima corrida"),
});

/**
 * 4. Schema de SAÍDA do LLM (O que a IA DEVE retornar)
 */
export const CognitiveReportOutputSchema = z.object({
  archetype: CognitiveArchetypeEnum.describe("O arquétipo mental dominante do piloto nesta corrida"),
  headline: z.string().describe("Frase de impacto resumindo a performance mental (máx 90 caracteres)"),
  narrative_summary: z
    .string()
    .describe("Análise narrativa em 2 a 3 parágrafos explicando como o cérebro reagiu às fases e eventos da corrida"),
  mental_strengths: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1 a 3 pontos fortes cognitivos demonstrados"),
  areas_for_improvement: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1 a 3 oportunidades claras de evolução mental"),
  actionable_drills: z
    .array(ActionableDrillSchema)
    .min(1)
    .max(2)
    .describe("1 ou 2 exercícios práticos recomendados para o perfil detectado"),
  badges_unlocked: z
    .array(CognitiveBadgeEnum)
    .describe("Lista de badges que o jogador conquistou baseadas nas métricas"),
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe("Grau de confiança da IA na análise com base na consistência dos dados"),
});

export type CognitiveReportOutput = z.infer<typeof CognitiveReportOutputSchema>;

/**
 * Gera um relatório seguro por regras heurísticas caso o LLM falhe ou esteja offline.
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