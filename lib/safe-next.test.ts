import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard?tab=perfil", "/dashboard?tab=perfil"],
    ["/ranking", "/ranking"],
    ["/dashboard?tab=perfil#share-title", "/dashboard?tab=perfil#share-title"],
  ])("aceita caminho interno %s", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "https://outro.site", "//outro.site", "/\\outro.site", "@outro.site", "javascript:alert(1)"])(
    "recusa %s e cai no /dashboard",
    (raw) => {
      expect(safeNext(raw)).toBe("/dashboard");
    },
  );

  // NEU-131: o navegador remove tab/CR/LF da URL, e "/\t/outro.site" vira "//outro.site".
  // O `next` chega já decodificado do searchParams (%09 → \t).
  it.each(["/\t/outro.site", "/\n/outro.site", "/\r/outro.site", "/\t\\outro.site"])(
    "recusa %j (caractere de controle que o navegador descarta)",
    (raw) => {
      expect(safeNext(raw)).toBe("/dashboard");
    },
  );

  // Normalizar o caminho não pode gerar "//host": "/..//outro.site" vira "//outro.site".
  it.each(["/..//outro.site", "/.//outro.site", "/%2e%2e//outro.site"])(
    "recusa %j (segmento de ponto que normaliza para //host)",
    (raw) => {
      expect(safeNext(raw)).toBe("/dashboard");
    },
  );

  // O que importa de verdade: resolvido como o `location.assign` resolve, o destino
  // continua no próprio site. Entradas como chegam na URL do /login (ainda codificadas).
  it.each([
    "%2F%09%2Foutro.site",
    "%2F%0A%2Foutro.site",
    "%2F%0D%2Foutro.site",
    "%2F%5C%09outro.site",
    "%2F%2E%2E%2F%2Foutro.site",
    "%2F%09%2F%09%2Foutro.site",
    "%2F%20%2Foutro.site",
    "%2F%00%2Foutro.site",
    "%2Fdashboard%3Ftab%3Dperfil",
  ])("next=%s resolve dentro do site", (encoded) => {
    const raw = new URLSearchParams(`next=${encoded}`).get("next");
    const dest = new URL(safeNext(raw), "https://neurorace-v2.vercel.app/login");
    expect(dest.host).toBe("neurorace-v2.vercel.app");
  });
});
