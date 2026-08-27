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

// Instanciação segura do cliente Google Gemini
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface GenerateReportOptions {
  model?: string;
  timeoutMs?: number;
}

/**
 * Função principal que orquestra a geração do relatório cognitivo via Gemini.
 */
export async function generateCognitiveReport(
  player: RaceSummary,
  opponent?: RaceSummary | null,
  options: GenerateReportOptions = {}
): Promise<{ report: CognitiveReportOutput; isFallback: boolean }> {
  // gemini-1.5-flash é ultrarrápido e gratuito
  const { model: modelName = "gemini-1.5-flash", timeoutMs = 10000 } = options;

  // 1. Extrai métricas consolidadas e detecta anomalias
  const payload = extractCognitiveFeatures(player, opponent);
  const avgAtt = player.metrics.avgAttention ?? 50;
  const chokeDetected = payload.extractedFeatures.chokeDetected;

  // 2. Se a API Key não estiver configurada no .env.local, usa o Fallback imediatamente
  if (!apiKey) {
    console.warn(
      "[NeuroRace AI] GEMINI_API_KEY não configurada. Utilizando relatório heurístico de fallback."
    );
    return {
      report: generateFallbackReport(avgAtt, chokeDetected),
      isFallback: true,
    };
  }

  // 3. Monta o prompt do usuário com contexto real
  const userPrompt = buildCognitiveUserPrompt(payload);

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: NEUROCOACH_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json", // Força saída puramente JSON
        temperature: 0.3,                    // Baixa temperatura para precisão analítica
      },
    });

    // Timeout com Promise.race para não prender a requisição
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout na chamada do Gemini")), timeoutMs)
    );

    const apiPromise = model.generateContent(userPrompt);

    const result = await Promise.race([apiPromise, timeoutPromise]);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("O Gemini retornou uma resposta vazia.");
    }

    // 4. Parse e validação estrita com Zod
    const rawJson = JSON.parse(responseText);
    const parsedReport = CognitiveReportOutputSchema.parse(rawJson);

    return {
      report: parsedReport,
      isFallback: false,
    };
  } catch (error: unknown) {
    console.error("[NeuroRace AI Error] Falha na chamada ao Gemini ou validação Zod:", error);

    // Retorna fallback gracioso sem quebrar o frontend
    return {
      report: generateFallbackReport(avgAtt, chokeDetected),
      isFallback: true,
    };
  }
}