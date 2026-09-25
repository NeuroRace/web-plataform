import { describe, it, expect } from "vitest";
import {
  CONSENT_METADATA_KEY,
  CONSENT_TERM_VERSION,
  buildWebConsent,
  hasValidConsent,
  revokeConsent,
} from "@/lib/consent";

const now = new Date("2026-09-25T12:00:00.000Z");

describe("consentimento LGPD (NEU-103)", () => {
  it("buildWebConsent grava versão do termo, data e canal web", () => {
    expect(buildWebConsent(now)).toEqual({
      term_version: CONSENT_TERM_VERSION,
      granted_at: "2026-09-25T12:00:00.000Z",
      channel: "web",
      revoked_at: null,
    });
  });

  it("aceita consentimento válido na versão atual do termo", () => {
    expect(hasValidConsent({ [CONSENT_METADATA_KEY]: buildWebConsent(now) })).toBe(true);
  });

  it("recusa metadata vazio, nulo ou sem a chave", () => {
    expect(hasValidConsent(undefined)).toBe(false);
    expect(hasValidConsent(null)).toBe(false);
    expect(hasValidConsent({})).toBe(false);
    expect(hasValidConsent({ [CONSENT_METADATA_KEY]: "sim" })).toBe(false);
  });

  it("recusa versão antiga do termo (novo termo exige novo aceite)", () => {
    const old = { ...buildWebConsent(now), term_version: "v0" };
    expect(hasValidConsent({ [CONSENT_METADATA_KEY]: old })).toBe(false);
  });

  it("recusa consentimento sem data de aceite", () => {
    const semData = { ...buildWebConsent(now), granted_at: "" };
    expect(hasValidConsent({ [CONSENT_METADATA_KEY]: semData })).toBe(false);
  });

  it("recusa consentimento revogado", () => {
    const revogado = revokeConsent(buildWebConsent(now), new Date("2026-09-26T00:00:00.000Z"));
    expect(revogado.revoked_at).toBe("2026-09-26T00:00:00.000Z");
    expect(revogado.granted_at).toBe("2026-09-25T12:00:00.000Z");
    expect(hasValidConsent({ [CONSENT_METADATA_KEY]: revogado })).toBe(false);
  });
});
