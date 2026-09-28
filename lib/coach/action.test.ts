import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildWebConsent, CONSENT_METADATA_KEY } from "@/lib/consent";
import { flat } from "@/lib/coach/test-utils";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  cachedAiNarrative: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
vi.mock("@/lib/coach/narrative-ai", () => ({ cachedAiNarrative: mocks.cachedAiNarrative }));

import { getCoachReportAction } from "@/lib/coach/action";

const STARTED = "2026-09-30T17:00:00.000Z";
const racePlayers = [{ id: "rp-1", race_id: "r-1", player_slot: 1, started_at: STARTED, finished_at: "2026-09-30T17:00:30.000Z" }];
const M = [...flat(40, 5), ...flat(70, 12), ...flat(20, 6), ...flat(75, 7)];
const telemetry = M.map((a, i) => ({
  race_player_id: "rp-1",
  t: new Date(Date.parse(STARTED) + i * 1000).toISOString(),
  attention: a,
  meditation: 50,
}));

/** race_players: select().order(); telemetry_points: select().order() e select().eq().order(). */
function mockTables(opts: { loadError?: boolean; telemetryForRace?: typeof telemetry } = {}) {
  const eqCalls: unknown[][] = [];
  mocks.from.mockImplementation((table: string) => {
    const rows = table === "race_players" ? racePlayers : telemetry;
    const result = opts.loadError ? { data: null, error: { message: "boom" } } : { data: rows, error: null };
    const order = () => Promise.resolve(result);
    return {
      select: () => ({
        order,
        eq: (...args: unknown[]) => {
          eqCalls.push(args);
          return {
            order: () =>
              Promise.resolve(opts.loadError ? result : { data: opts.telemetryForRace ?? telemetry, error: null }),
          };
        },
      }),
    };
  });
  return eqCalls;
}

const consented = { [CONSENT_METADATA_KEY]: buildWebConsent(new Date("2026-09-28T12:00:00.000Z")) };
const aiText = { headline: "Texto gerado pela IA ok", summary: "Resumo da IA com mais de quarenta caracteres, só números dos fatos: 56." };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GROQ_API_KEY = "test-key";
  mocks.cachedAiNarrative.mockResolvedValue(aiText);
});
afterEach(() => {
  delete process.env.GROQ_API_KEY;
});

describe("getCoachReportAction (spec §6)", () => {
  it("id inválido → not_found sem tocar no Supabase", async () => {
    await expect(getCoachReportAction("")).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(getCoachReportAction("x".repeat(65))).resolves.toEqual({ ok: false, reason: "not_found" });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("sem sessão → unauthenticated, sem ler dados", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(getCoachReportAction("rp-1")).resolves.toEqual({ ok: false, reason: "unauthenticated" });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("corrida que não é do usuário (fora da RLS) → not_found", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    await expect(getCoachReportAction("rp-de-outra-pessoa")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it("carrega a telemetria da corrida selecionada filtrando pelo id (limite de 1000 linhas)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    const eqCalls = mockTables();
    await getCoachReportAction("rp-1");
    expect(eqCalls).toEqual([["race_player_id", "rp-1"]]);
  });

  it("sem consentimento → texto-modelo, sem chamar a IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
    expect(res.ok && res.facts.archetype).toBe("OSCILADOR");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("sem GROQ_API_KEY → texto-modelo", async () => {
    delete process.env.GROQ_API_KEY;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("com consentimento e chave → texto da IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    const res = await getCoachReportAction("rp-1");
    expect(res).toMatchObject({ ok: true, narrative: { ...aiText, source: "ai" } });
    expect(mocks.cachedAiNarrative).toHaveBeenCalledTimes(1);
  });

  it("IA falha → texto-modelo", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    mocks.cachedAiNarrative.mockRejectedValue(new Error("neurocoach_ai_banned_term"));
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
  });

  it("IA reprovou a resposta (null do cache) → texto-modelo", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    mocks.cachedAiNarrative.mockResolvedValue(null);
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.narrative.source).toBe("template");
  });

  it("log do fallback não leva conteúdo da resposta da IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables();
    mocks.cachedAiNarrative.mockRejectedValue(new SyntaxError('Unexpected token in JSON at "texto secreto do modelo"'));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await getCoachReportAction("rp-1");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain("texto secreto");
    warn.mockRestore();
  });

  it("corrida com poucos dados não chama a IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: consented } } });
    mockTables({ telemetryForRace: telemetry.slice(0, 5) });
    const res = await getCoachReportAction("rp-1");
    expect(res.ok && res.facts.quality).toBe("insufficient");
    expect(mocks.cachedAiNarrative).not.toHaveBeenCalled();
  });

  it("erro ao ler o banco → error", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });
    mockTables({ loadError: true });
    await expect(getCoachReportAction("rp-1")).resolves.toEqual({ ok: false, reason: "error" });
  });
});
