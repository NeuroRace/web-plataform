import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RaceSummary } from "@/lib/metrics";
import { extractCognitiveFeatures } from "../feature-extractor";
import {
  NEUROCOACH_SYSTEM_PROMPT,
  buildCognitiveUserPrompt,
} from "../prompts/cognitive-coach.prompt";
import {
  CognitiveReportOutputSchema,
  generateFallbackReport,
  type CognitiveReportOutput,
} from "../schemas/cognitive-report.schema";

export interface GenerateReportOptions {
  model?: string;
  timeoutMs?: number;
}

/**
 * Modelos suportados na sua conta em ordem de prioridade
 */
const ACTIVE_MODELS_POOL = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

/**
 * Função principal que orquestra a geração do relatório cognitivo via Gemini com Failover.
 */
export async function generateCognitiveReport(
  player: RaceSummary,
  opponent?: RaceSummary | null,
  options: GenerateReportOptions = {}
): Promise<{ report: CognitiveReportOutput; isFallback: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  const { timeoutMs = 8000 } = options;

  // 1. Extrai métricas consolidadas e detecta anomalias
  const payload = extractCognitiveFeatures(player, opponent);
  const avgAtt = player.metrics.avgAttention ?? 50;
  const chokeDetected = payload.extractedFeatures.chokeDetected;

  // 2. Se a API Key não estiver configurada, usa o Fallback
  if (!apiKey) {
    console.warn(
      "[NeuroRace AI] GEMINI_API_KEY não configurada. Utilizando relatório heurístico de fallback."
    );
    return {
      report: generateFallbackReport(avgAtt, chokeDetected),
      isFallback: true,
    };
  }

  // 3. Monta o prompt contextual
  const userPrompt = buildCognitiveUserPrompt(payload);
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelsToTry = options.model ? [options.model, ...ACTIVE_MODELS_POOL] : ACTIVE_MODELS_POOL;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: NEUROCOACH_SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms no modelo ${modelName}`)), timeoutMs)
      );

      const apiPromise = model.generateContent(userPrompt);
      const result = await Promise.race([apiPromise, timeoutPromise]);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error(`Resposta vazia do modelo ${modelName}`);
      }

      // 4. Parse e validação estrita via Zod
      const rawJson = JSON.parse(responseText);
      const parsedReport = CognitiveReportOutputSchema.parse(rawJson);

      return {
        report: parsedReport,
        isFallback: false,
      };
    } catch (err: unknown) {
      console.warn(`[NeuroRace AI] Modelo '${modelName}' indisponível ou em alta demanda, tentando próximo...`);
    }
  }

  console.error("[NeuroRace AI Error] Todos os modelos do Gemini falharam/sobrecarregados. Acionando Fallback.");
  return {
    report: generateFallbackReport(avgAtt, chokeDetected),
    isFallback: true,
  };
}