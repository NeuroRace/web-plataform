/**
 * Consentimento LGPD do dado de EEG (ADR 0003, NEU-103).
 *
 * PROVISÓRIO: enquanto a tabela `consents` do cloud-backend (NEU-98) não existe,
 * o aceite do canal web fica no `user_metadata` do Supabase Auth, na chave
 * `lgpd_consent`. A NEU-98 migra esses registros para `consents`. O próprio
 * usuário consegue editar o metadata, então isto é registro, não prova forte.
 */

export const CONSENT_TERM_VERSION = "v1";
export const CONSENT_METADATA_KEY = "lgpd_consent";

export interface ConsentRecord {
  term_version: string;
  granted_at: string;
  channel: "web";
  revoked_at: string | null;
}

export function buildWebConsent(now: Date = new Date()): ConsentRecord {
  return {
    term_version: CONSENT_TERM_VERSION,
    granted_at: now.toISOString(),
    channel: "web",
    revoked_at: null,
  };
}

export function revokeConsent(consent: ConsentRecord, now: Date = new Date()): ConsentRecord {
  return { ...consent, revoked_at: now.toISOString() };
}

/** Lê o registro do metadata, ou null se não houver um bem-formado. */
export function readConsent(metadata: unknown): ConsentRecord | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>)[CONSENT_METADATA_KEY];
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<ConsentRecord>;
  if (typeof c.term_version !== "string" || typeof c.granted_at !== "string") return null;
  return {
    term_version: c.term_version,
    granted_at: c.granted_at,
    channel: "web",
    revoked_at: typeof c.revoked_at === "string" ? c.revoked_at : null,
  };
}

/** Consentimento válido = versão atual do termo, com data de aceite e sem revogação. */
export function hasValidConsent(metadata: unknown): boolean {
  const c = readConsent(metadata);
  return (
    c !== null &&
    c.term_version === CONSENT_TERM_VERSION &&
    !Number.isNaN(Date.parse(c.granted_at)) &&
    c.revoked_at === null
  );
}
