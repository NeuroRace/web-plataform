import { createHash } from "node:crypto";
import OpenAI from "openai";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { BANNED_TERMS } from "./narrative-template";
import { ARCHETYPE_INFO, BADGE_INFO } from "./rules";
import type { CoachFacts } from "./types";

/** Mude ao alterar o prompt: invalida o cache do texto. */
export const PROMPT_VERSION = "neurocoach-v1";
export const DEFAULT_MODEL = "openai/gpt-oss-120b";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const SYSTEM_PROMPT = [
  "Você é o NeuroCoach do NeuroRace, um jogo de corrida controlado pelo índice de atenção do fone NeuroSky.",
  "Recebe um JSON com os fatos de UMA corrida, já calculados. Escreva em português do Brasil:",
  '- "headline": uma frase de 10 a 80 caracteres;',
  '- "summary": 2 ou 3 frases, de 40 a 400 caracteres, no tom de um engenheiro de corrida encorajador.',
  "Regras obrigatórias:",
  "- Use SOMENTE números que aparecem no JSON. Tempos em segundos (ex.: 'aos 27 s'), nunca em minutos.",
  "- Não fale de ultrapassagem, oponente, adversário, posição na pista nem de ondas cerebrais (alfa, beta).",
  "  O NeuroSky mede um índice de atenção e um de calma, de 0 a 100.",
  "- Não invente fatos nem dê conselho médico.",
  'Responda apenas com o JSON {"headline": "...", "summary": "..."}.',
].join("\n");

export function buildLlmInput(facts: CoachFacts) {
  const m = facts.metrics;
  const r = (v: number | null) => (v === null ? null : Math.round(v));
  const prev = facts.progress.previous;
  return {
    qualidade: facts.quality,
    arquetipo: facts.archetype ? ARCHETYPE_INFO[facts.archetype].label : null,
    metricas: {
      foco_medio: r(m.avgAttention),
      pico_de_foco: r(m.peakAttention),
      zona_de_foco_pct: r(m.focusZonePct),
      calma_media: r(m.avgMeditation),
      duracao_s: r(m.durationSeconds),
      foco_por_terco: m.thirds ? m.thirds.map((v) => Math.round(v)) : null,
      volatilidade: r(m.volatility),
      melhor_sequencia_s: m.bestStreakSeconds,
    },
    momentos: facts.moments.map((x) => ({ tipo: x.kind, segundo: x.t, fim_s: x.tEnd ?? null, valor: x.value })),
    badges: facts.badges.map((b) => BADGE_INFO[b].label),
    evolucao: {
      corrida_numero: facts.progress.raceNumber,
      variacao_foco_pts: prev ? r(prev.attentionDelta) : null,
      variacao_tempo_s: prev ? r(prev.durationDelta) : null,
    },
    meta: facts.goal
      ? { tipo: facts.goal.kind, hoje: facts.goal.current, alvo: facts.goal.target, unidade: facts.goal.unit }
      : null,
  };
}
export type LlmInput = ReturnType<typeof buildLlmInput>;

export function narrativeCacheKey(input: LlmInput, model: string): string {
  return createHash("sha256").update(`${PROMPT_VERSION}|${model}|${JSON.stringify(input)}`).digest("hex");
}

/** Todo número do texto tem de estar nos fatos (ou ser pequeno, até 3). */
export function numbersGrounded(text: string, input: LlmInput): boolean {
  const allowed = new Set<number>([0, 1, 2, 3]);
  for (const n of JSON.stringify(input).match(/-?\d+(?:\.\d+)?/g) ?? []) allowed.add(Math.abs(Number(n)));
  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.every((n) => allowed.has(Number(n.replace(",", "."))));
}

const OutputSchema = z.object({
  headline: z.string().trim().min(10).max(80),
  summary: z.string().trim().min(40).max(400),
});

export function parseNarrative(raw: string | null, input: LlmInput): { headline: string; summary: string } {
  if (!raw) throw new Error("neurocoach_ai_empty");
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = OutputSchema.parse(JSON.parse(cleaned));
  const text = `${parsed.headline} ${parsed.summary}`;
  if (BANNED_TERMS.test(text)) throw new Error("neurocoach_ai_banned_term");
  if (!numbersGrounded(text, input)) throw new Error("neurocoach_ai_ungrounded_number");
  return parsed;
}

export type CompletionFn = (args: {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format: { type: "json_object" };
  temperature: number;
}) => Promise<string | null>;

function groqCompletion(apiKey: string, timeoutMs: number): CompletionFn {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL, timeout: timeoutMs, maxRetries: 0 });
  return async (args) => (await client.chat.completions.create(args)).choices[0]?.message?.content ?? null;
}

export async function generateAiNarrative(
  facts: CoachFacts,
  opts: { apiKey: string; model?: string; timeoutMs?: number; complete?: CompletionFn },
): Promise<{ headline: string; summary: string }> {
  const input = buildLlmInput(facts);
  const model = opts.model ?? DEFAULT_MODEL;
  const complete = opts.complete ?? groqCompletion(opts.apiKey, opts.timeoutMs ?? 8000);
  const raw = await complete({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });
  return parseNarrative(raw, input);
}

/** 1 chamada por corrida: cache por hash dos fatos + versão do prompt + modelo. Erro não é cacheado. */
export async function cachedAiNarrative(
  facts: CoachFacts,
  apiKey: string,
  model: string = process.env.GROQ_MODEL || DEFAULT_MODEL,
): Promise<{ headline: string; summary: string }> {
  const key = narrativeCacheKey(buildLlmInput(facts), model);
  const run = unstable_cache(() => generateAiNarrative(facts, { apiKey, model }), ["neurocoach-narrative", key], {
    revalidate: false,
  });
  return run();
}
