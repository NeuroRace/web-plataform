import { statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARCHETYPE_INFO, BADGE_INFO } from "@/lib/coach/rules";
import type { Archetype, Badge } from "@/lib/coach/types";
import { COLLECTION, FRAMES, STICKERS, TOTAL_ITEMS, characterArtFor } from "./catalog";

describe("catálogo da coleção (NEU-134)", () => {
  it("tem 8 molduras e 9 figurinhas, com ids únicos", () => {
    expect(FRAMES).toHaveLength(8);
    expect(STICKERS).toHaveLength(9);
    expect(TOTAL_ITEMS).toBe(17);
    const ids = COLLECTION.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada arquétipo do NeuroCoach tem exatamente uma moldura, e a NeuroRace vem com a conta", () => {
    const archetypes = FRAMES.flatMap((f) => (f.rule.type === "archetype" ? [f.rule.archetype] : []));
    expect([...archetypes].sort()).toEqual((Object.keys(ARCHETYPE_INFO) as Archetype[]).sort());
    expect(FRAMES.filter((f) => f.rule.type === "account").map((f) => f.id)).toEqual(["neurorace"]);
  });

  it("cada conquista do NeuroCoach tem exatamente uma figurinha, e a Piloto NeuroRace vem com a conta", () => {
    const badges = STICKERS.flatMap((s) => (s.rule.type === "badge" ? [s.rule.badge] : []));
    expect([...badges].sort()).toEqual((Object.keys(BADGE_INFO) as Badge[]).sort());
    expect(STICKERS.filter((s) => s.rule.type === "account").map((s) => s.id)).toEqual(["piloto-neurorace"]);
  });

  it("todo item tem nome, significado, como ganhar e uma arte que existe em public/ com até 200 KB", () => {
    for (const item of COLLECTION) {
      expect(item.name.length, item.id).toBeGreaterThan(0);
      expect(item.meaning.length, item.id).toBeGreaterThan(0);
      expect(item.how.length, item.id).toBeGreaterThan(0);
      expect(item.color, item.id).toMatch(/^#[0-9a-f]{6}$/);
      const size = statSync(join(process.cwd(), "public", item.art)).size;
      expect(size, item.art).toBeLessThanOrEqual(200 * 1024);
    }
  });

  it("o personagem de cada arquétipo é a arte da moldura dele", () => {
    expect(characterArtFor("SPRINTER")).toBe("/assets/colecao/personagem-sprinter.png");
    expect(characterArtFor("MESTRE_ZEN")).toBe("/assets/colecao/personagem-mestre-zen.png");
    for (const f of FRAMES) {
      if (f.rule.type === "archetype") expect(characterArtFor(f.rule.archetype)).toBe(f.art);
    }
  });
});
