import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildRace, resolveSeedConfig, validate } from "./seed-demo.mjs";

const baseEnv = {
  SEED_EMAIL: " Demo@Example.com ",
  SEED_SUPABASE_URL: "http://127.0.0.1:54321",
  EDGE_INGEST_TOKEN: "t",
};

describe("resolveSeedConfig (NEU-74)", () => {
  it("exige SEED_SUPABASE_URL explícita: sem fallback para produção", () => {
    expect(() => resolveSeedConfig({ ...baseEnv, SEED_SUPABASE_URL: undefined })).toThrow(
      /SEED_SUPABASE_URL/,
    );
  });

  it("exige SEED_EMAIL: sem e-mail pessoal como default", () => {
    expect(() => resolveSeedConfig({ ...baseEnv, SEED_EMAIL: undefined })).toThrow(/SEED_EMAIL/);
  });

  it("usa a URL e o e-mail passados (e-mail normalizado)", () => {
    const cfg = resolveSeedConfig(baseEnv);
    expect(cfg.baseUrl).toBe("http://127.0.0.1:54321");
    expect(cfg.email).toBe("demo@example.com");
    expect(cfg.nRaces).toBe(7);
  });

  it("dry-run não precisa de URL nem de credencial", () => {
    const cfg = resolveSeedConfig({ SEED_EMAIL: "a@b.com", SEED_DRY: "1" });
    expect(cfg.dry).toBe(true);
  });
});

describe("buildRace (NEU-74)", () => {
  const cfg = { email: "demo@example.com", nRaces: 7 };

  it("marca a corrida como bot, para ficar fora do ranking público", () => {
    expect(buildRace(0, cfg).source).toBe("bot");
  });

  it("não reaproveita IDs de seeds antigos (gravados como real): cria corridas novas como bot", () => {
    // IDs que o seeder antigo gerava: det(`${email}|idem|${i}`) / det(`${email}|raceid|${i}`).
    const legacy = (seed) => {
      const h = createHash("sha1").update(seed).digest("hex");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
    };
    const r = buildRace(0, cfg);
    expect(r.idempotency_key).not.toBe(legacy("demo@example.com|idem|0"));
    expect(r.race_id).not.toBe(legacy("demo@example.com|raceid|0"));
  });

  it("continua gerando payload válido e determinístico", () => {
    const a = buildRace(3, cfg);
    expect(validate(a)).toEqual([]);
    expect(buildRace(3, cfg).idempotency_key).toBe(a.idempotency_key);
    expect(a.player_email).toBe("demo@example.com");
  });
});
