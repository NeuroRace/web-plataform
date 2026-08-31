import OpenAI from "openai";
import { ZodError } from "zod";
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
 * Limpa blocos de código Markdown (```json ... ```) caso o modelo os inclua.
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Função principal que orquestra a geração do relatório cognitivo via Groq.
 */
export async function generateCognitiveReport(
  player: RaceSummary,
  opponent?: RaceSummary | null,
  options: GenerateReportOptions = {}
): Promise<{ report: CognitiveReportOutput; isFallback: boolean }> {
  const apiKey = process.env.GROQ_API_KEY || "";
  const modelName = options.model || "openai/gpt-oss-120b";
  const timeoutMs = options.timeoutMs || 10000;

  // 1. Extrai métricas consolidadas
  const payload = extractCognitiveFeatures(player, opponent);
  const avgAtt = player.metrics.avgAttention ?? 50;
  const chokeDetected = payload.extractedFeatures.chokeDetected;

  if (!apiKey) {
    console.warn("[NeuroRace AI] GROQ_API_KEY não configurada. Usando fallback.");
    return {
      report: generateFallbackReport(avgAtt, chokeDetected),
      isFallback: true,
    };
  }

  const userPrompt = buildCognitiveUserPrompt(payload);
  const groq = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: timeoutMs, // timeout utilizado no SDK
  });

  try {
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: NEUROCOACH_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("A API retornou conteúdo vazio.");
    }

    // Limpa possíveis tags de markdown
    const cleanedJson = cleanJsonString(content);
    const rawParsed = JSON.parse(cleanedJson);

    // Valida com o Zod
    const validatedReport = CognitiveReportOutputSchema.parse(rawParsed);

    return {
      report: validatedReport,
      isFallback: false,
    };
  } catch (error: unknown) {
    console.error("================ DETALHES DO ERRO ================");
    if (error instanceof ZodError) {
      console.error("ERRO DE SCHEMA DO ZOD:", JSON.stringify(error.issues, null, 2));
    } else if (error instanceof Error) {
      console.error("ERRO NA CHAMADA OU PARSE:", error.message);
    } else {
      console.error("ERRO DESCONHECIDO:", String(error));
    }
    console.error("==================================================");

    return {
      report: generateFallbackReport(avgAtt, chokeDetected),
      isFallback: true,
    };
  }
}