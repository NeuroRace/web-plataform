import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeRace } from "@/lib/coach/analyze";
import {
  DEFAULT_MODEL,
  SYSTEM_PROMPT,
  buildLlmInput,
  cachedAiNarrative,
  generateAiNarrative,
  narrativeCacheKey,
  narrativeOrNull,
  numbersGrounded,
  parseNarrative,
  type CompletionFn,
} from "@/lib/coach/narrative-ai";
import { flat, makeRace } from "@/lib/coach/test-utils";

// Cache falso com a semântica do real: guarda só o que resolve (rejeição não é gravada).
// Nenhuma chamada de rede: o modelo é sempre injetado via `complete`.
const cache = vi.hoisted(() => ({
  entries: new Map<string, unknown>(),
  revalidate: new Map<string, unknown>(),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, keyParts: string[], opts: { revalidate: unknown }) => {
    const key = keyParts.join("|");
    cache.revalidate.set(keyParts[0], opts.revalidate);
    return async () => {
      if (cache.entries.has(key)) return cache.entries.get(key);
      const value = await fn();
      cache.entries.set(key, value);
      return value;
    };
  },
}));
/** Simula o fim do prazo de um nível do cache (ex.: 24 h da tentativa). */
const expire = (level: string) => {
  for (const k of [...cache.entries.keys()]) if (k.startsWith(`${level}|`)) cache.entries.delete(k);
};

const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];
const race = makeRace(M, { id: "rp-secreto-123" });
const facts = analyzeRace(race, [race]);
const input = buildLlmInput(facts);

const good = {
  headline: "Foco em altos e baixos na sua corrida",
  summary: "Seu foco médio ficou em 56, com 10 s seguidos em foco alto a partir dos 8 s e uma virada de 55 pontos aos 27 s.",
};

describe("buildLlmInput — só agregados (NEU-94)", () => {
  it("não leva id, data nem e-mail", () => {
    const json = JSON.stringify(input);
    expect(json).not.toContain("rp-secreto-123");
    expect(json).not.toContain("race-rp-secreto-123");
    expect(json).not.toMatch(/2026-09-30|@/);
  });
  it("leva rótulos e números arredondados", () => {
    expect(input.arquetipo).toBe("Oscilador");
    expect(input.metricas.foco_medio).toBe(56);
    expect(input.momentos).toHaveLength(3);
  });
});

describe("numbersGrounded", () => {
  it("aceita números dos fatos e números pequenos", () => {
    expect(numbersGrounded("foco 56, 10 s, 3 momentos", input)).toBe(true);
  });
  it("aceita a escala do índice, a janela de 5 s e o limiar da zona de foco", () => {
    expect(numbersGrounded("No índice de 0 a 100, sua média foi 56. Em 5 s você subiu, e a zona de foco começa em 60.", input)).toBe(true);
  });
  it("recusa número inventado", () => {
    expect(numbersGrounded("seu foco foi 87", input)).toBe(false);
  });
});

describe("parseNarrative", () => {
  it("aceita JSON válido, inclusive dentro de bloco ```json", () => {
    expect(parseNarrative(JSON.stringify(good), input)).toEqual(good);
    expect(parseNarrative("```json\n" + JSON.stringify(good) + "\n```", input)).toEqual(good);
  });
  it.each([
    ["vazio", null],
    ["JSON inválido", "{headline:"],
    ["headline curta", JSON.stringify({ ...good, headline: "Oi" })],
    ["termo proibido", JSON.stringify({ ...good, summary: good.summary + " Suas ondas beta subiram." })],
    ["ultrapassagem", JSON.stringify({ ...good, headline: "Ultrapassagem decisiva no fim" })],
    ["número inventado", JSON.stringify({ ...good, summary: good.summary.replace("56", "87") })],
  ])("recusa %s", (_, raw) => {
    expect(() => parseNarrative(raw as string | null, input)).toThrow();
  });
});

describe("generateAiNarrative", () => {
  it("chama o modelo com system prompt, JSON dos fatos e temperatura 0.4", async () => {
    const complete = vi.fn<CompletionFn>().mockResolvedValue(JSON.stringify(good));
    await expect(generateAiNarrative(facts, { apiKey: "k", complete })).resolves.toEqual(good);
    const args = complete.mock.calls[0][0];
    expect(args.model).toBe(DEFAULT_MODEL);
    expect(args.temperature).toBe(0.4);
    expect(args.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(JSON.parse(args.messages[1].content)).toEqual(input);
  });

  it("propaga a falha do modelo", async () => {
    const complete = vi.fn<CompletionFn>().mockRejectedValue(new Error("timeout"));
    await expect(generateAiNarrative(facts, { apiKey: "k", complete })).rejects.toThrow("timeout");
  });
});

describe("narrativeOrNull — resposta reprovada vira null (cacheável); falha de rede propaga", () => {
  it.each([
    ["termo proibido", JSON.stringify({ ...good, headline: "Ultrapassagem decisiva no fim" })],
    ["JSON inválido", "{headline:"],
    ["vazio", null],
  ])("%s → null", async (_, raw) => {
    const complete = vi.fn<CompletionFn>().mockResolvedValue(raw as string | null);
    await expect(narrativeOrNull(facts, { apiKey: "k", complete })).resolves.toBeNull();
  });

  it("resposta válida passa", async () => {
    const complete = vi.fn<CompletionFn>().mockResolvedValue(JSON.stringify(good));
    await expect(narrativeOrNull(facts, { apiKey: "k", complete })).resolves.toEqual(good);
  });

  it("falha de rede/timeout propaga (não é cacheada)", async () => {
    const complete = vi.fn<CompletionFn>().mockRejectedValue(new Error("timeout"));
    await expect(narrativeOrNull(facts, { apiKey: "k", complete })).rejects.toThrow("timeout");
  });
});

describe("cache", () => {
  it("a chave é estável e muda com o modelo", () => {
    expect(narrativeCacheKey(input, "m1")).toBe(narrativeCacheKey(input, "m1"));
    expect(narrativeCacheKey(input, "m1")).not.toBe(narrativeCacheKey(input, "m2"));
    expect(narrativeCacheKey(input, "m1")).toMatch(/^[0-9a-f]{64}$/);
  });

  // Um nível só: no Next 16, unstable_cache aninhado ignora o cache interno (bypass), então
  // um desenho de dois níveis chamaria a Groq a cada abertura das corridas reprovadas.
  describe("cachedAiNarrative — sucesso e reprovação guardados por 24 h; falha de rede não", () => {
    beforeEach(() => cache.entries.clear());

    it("sucesso: 1 chamada ao modelo por janela de 24 h", async () => {
      const complete = vi.fn<CompletionFn>().mockResolvedValue(JSON.stringify(good));
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toEqual(good);
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toEqual(good);
      expect(complete).toHaveBeenCalledTimes(1);
      expire("neurocoach-narrative"); // passaram as 24 h
      await cachedAiNarrative(facts, "k", "m1", { complete });
      expect(complete).toHaveBeenCalledTimes(2);
    });

    it("reprovada: null guardado (sem nova chamada); depois das 24 h tenta de novo", async () => {
      const complete = vi
        .fn<CompletionFn>()
        .mockResolvedValueOnce(JSON.stringify({ ...good, headline: "Ultrapassagem decisiva no fim" }))
        .mockResolvedValueOnce(JSON.stringify(good));
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toBeNull();
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toBeNull();
      expect(complete).toHaveBeenCalledTimes(1);
      expire("neurocoach-narrative");
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toEqual(good);
      expect(complete).toHaveBeenCalledTimes(2);
    });

    it("falha de rede não é guardada: a próxima abertura tenta de novo", async () => {
      const complete = vi.fn<CompletionFn>().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(JSON.stringify(good));
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).rejects.toThrow("timeout");
      await expect(cachedAiNarrative(facts, "k", "m1", { complete })).resolves.toEqual(good);
      expect(complete).toHaveBeenCalledTimes(2);
    });

    it("um único unstable_cache, prazo de 24 h, chave pelo hash dos fatos", async () => {
      cache.revalidate.clear();
      const complete = vi.fn<CompletionFn>().mockResolvedValue(JSON.stringify(good));
      await cachedAiNarrative(facts, "k", "m1", { complete });
      expect([...cache.revalidate.entries()]).toEqual([["neurocoach-narrative", 86_400]]);
      expect([...cache.entries.keys()]).toEqual([`neurocoach-narrative|${narrativeCacheKey(input, "m1")}`]);
    });
  });
});
