"use server";

import type { RaceSummary } from "@/lib/metrics";
import { generateCognitiveReport } from "../services/cognitive-engine.service";
import type { CognitiveReportOutput } from "../schemas/cognitive-report.schema";

export interface GenerateReportActionResult {
  success: boolean;
  data?: CognitiveReportOutput;
  isFallback?: boolean;
  error?: string;
}

/**
 * Server Action invocada pelo Dashboard para gerar a análise cognitiva de uma corrida.
 */
export async function getCognitiveReportAction(
  playerSummary: RaceSummary,
  opponentSummary?: RaceSummary | null
): Promise<GenerateReportActionResult> {
  try {
    if (!playerSummary || !playerSummary.metrics) {
      return {
        success: false,
        error: "Dados de telemetria da corrida inválidos ou ausentes.",
      };
    }

    const { report, isFallback } = await generateCognitiveReport(
      playerSummary,
      opponentSummary
    );

    return {
      success: true,
      data: report,
      isFallback,
    };
  } catch (err: unknown) {
    console.error("[Action Error] Erro ao processar relatório cognitivo:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido ao gerar análise.",
    };
  }
}