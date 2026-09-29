import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard?tab=perfil", "/dashboard?tab=perfil"],
    ["/ranking", "/ranking"],
  ])("aceita caminho interno %s", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "https://outro.site", "//outro.site", "/\\outro.site", "@outro.site", "javascript:alert(1)"])(
    "recusa %s e cai no /dashboard",
    (raw) => {
      expect(safeNext(raw)).toBe("/dashboard");
    },
  );
});
