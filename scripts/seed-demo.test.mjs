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

  it("continua gerando payload válido e determinístico", () => {
    const a = buildRace(3, cfg);
    expect(validate(a)).toEqual([]);
    expect(buildRace(3, cfg).idempotency_key).toBe(a.idempotency_key);
    expect(a.player_email).toBe("demo@example.com");
  });
});
