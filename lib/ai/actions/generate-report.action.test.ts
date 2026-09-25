import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RaceSummary } from "@/lib/metrics";
import { CONSENT_METADATA_KEY, buildWebConsent } from "@/lib/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  generateCognitiveReport: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/ai/services/cognitive-engine.service", () => ({
  generateCognitiveReport: mocks.generateCognitiveReport,
}));

import { getCognitiveReportAction } from "@/lib/ai/actions/generate-report.action";

const race: RaceSummary = {
  racePlayerId: "rp-1",
  raceId: "r-1",
  slot: 1,
  startedAt: "2026-08-28T15:00:00.000Z",
  finishedAt: "2026-08-28T15:01:00.000Z",
  metrics: {
    avgAttention: 60,
    peakAttention: 90,
    focusZonePct: 50,
    avgMeditation: 45,
    durationSeconds: 60,
    sampleCount: 60,
  },
  series: [{ t: 0, attention: 60, meditation: 45 }],
};

function userWith(metadata: Record<string, unknown>) {
  return { data: { user: { id: "u1", user_metadata: metadata } }, error: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generateCognitiveReport.mockResolvedValue({ report: { headline: "ok" }, isFallback: false });
});

describe("getCognitiveReportAction (NEU-103)", () => {
  it("sem sessão: recusa e não chama a IA", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await getCognitiveReportAction(race);
    expect(res).toMatchObject({ success: false, reason: "unauthenticated" });
    expect(mocks.generateCognitiveReport).not.toHaveBeenCalled();
  });

  it("sem consentimento: recusa com no_consent e não chama a IA", async () => {
    mocks.getUser.mockResolvedValue(userWith({}));
    const res = await getCognitiveReportAction(race);
    expect(res).toMatchObject({ success: false, reason: "no_consent" });
    expect(mocks.generateCognitiveReport).not.toHaveBeenCalled();
  });

  it("com consentimento revogado: recusa com no_consent", async () => {
    mocks.getUser.mockResolvedValue(
      userWith({ [CONSENT_METADATA_KEY]: { ...buildWebConsent(), revoked_at: new Date().toISOString() } }),
    );
    const res = await getCognitiveReportAction(race);
    expect(res).toMatchObject({ success: false, reason: "no_consent" });
    expect(mocks.generateCognitiveReport).not.toHaveBeenCalled();
  });

  it("com consentimento válido: gera o relatório", async () => {
    mocks.getUser.mockResolvedValue(userWith({ [CONSENT_METADATA_KEY]: buildWebConsent() }));
    const res = await getCognitiveReportAction(race);
    expect(res).toMatchObject({ success: true, isFallback: false });
    expect(mocks.generateCognitiveReport).toHaveBeenCalledOnce();
  });
});
