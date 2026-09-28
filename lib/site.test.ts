import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, resolveSiteUrl, site } from "./site";

describe("resolveSiteUrl", () => {
  it("usa a URL de produção quando a env não está definida", () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("")).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("   ")).toBe(DEFAULT_SITE_URL);
  });

  it("aceita NEXT_PUBLIC_SITE_URL e remove a barra final", () => {
    expect(resolveSiteUrl("https://neurorace.com.br/")).toBe("https://neurorace.com.br");
    expect(resolveSiteUrl(" https://neurorace.com.br ")).toBe("https://neurorace.com.br");
  });

  it("ignora valor inválido em vez de quebrar o build (metadataBase faz new URL)", () => {
    expect(resolveSiteUrl("neurorace")).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl("ftp://neurorace.com.br")).toBe(DEFAULT_SITE_URL);
  });
});

describe("site", () => {
  it("não aponta mais para o deploy morto neurorace.vercel.app (NEU-80)", () => {
    const all = JSON.stringify(site);
    expect(all).not.toMatch(/\/\/neurorace\.vercel\.app/);
  });

  it("links de share carregam a URL do site codificada", () => {
    const encoded = encodeURIComponent(site.url);
    expect(site.social.linkedinShare).toContain(`url=${encoded}`);
    expect(site.social.twitterShare).toContain(`url=${encoded}`);
  });
});
