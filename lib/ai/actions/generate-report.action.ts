"use server";

import type { RaceSummary } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import { hasValidConsent } from "@/lib/consent";
import { generateCognitiveReport } from "../services/cognitive-engine.service";
import type { CognitiveReportOutput } from "../schemas/cognitive-report.schema";

export interface GenerateReportActionResult {
  success: boolean;
  data?: CognitiveReportOutput;
  isFallback?: boolean;
  error?: string;
  /** Por que a análise foi recusada antes de chegar à IA. */
  reason?: "unauthenticated" | "no_consent";
}

/**
 * Server Action invocada pelo Dashboard para gerar a análise cognitiva de uma corrida.
 * NEU-103: só roda para usuário logado e com consentimento LGPD válido. O gate fica
 * aqui, no servidor, porque a action pode ser chamada direto, sem passar pela UI.
 */
export async function getCognitiveReportAction(
  playerSummary: RaceSummary,
  opponentSummary?: RaceSummary | null
): Promise<GenerateReportActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, reason: "unauthenticated", error: "Sessão expirada." };
    }
    if (!hasValidConsent(user.user_metadata)) {
      return {
        success: false,
        reason: "no_consent",
        error: "Análise da IA exige autorização de uso dos dados de EEG.",
      };
    }

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
