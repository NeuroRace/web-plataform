import { describe, expect, it } from "vitest";
import { loginRedirectUrl } from "@/lib/supabase/middleware";
import { safeNext } from "@/lib/safe-next";

const ORIGIN = "https://neurorace-v2.vercel.app";

function redirectFor(path: string) {
  return loginRedirectUrl(new URL(path, ORIGIN));
}

// NEU-136: o destino guardado no `next` leva a query junto, e o /login não herda a query do painel.
describe("loginRedirectUrl", () => {
  it.each([
    ["/dashboard/selfie?moldura=sprinter", "/dashboard/selfie?moldura=sprinter"],
    ["/dashboard?tab=colecao", "/dashboard?tab=colecao"],
    ["/dashboard/compartilhar?modelo=arquetipo&x=1", "/dashboard/compartilhar?modelo=arquetipo&x=1"],
    ["/dashboard", "/dashboard"],
  ])("%s guarda o caminho e a query no next", (path, next) => {
    const url = redirectFor(path);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/login");
    expect([...url.searchParams.keys()]).toEqual(["next"]);
    expect(url.searchParams.get("next")).toBe(next);
  });

  it("codifica o next inteiro na URL do login", () => {
    expect(redirectFor("/dashboard/selfie?moldura=sprinter").search).toBe(
      "?next=%2Fdashboard%2Fselfie%3Fmoldura%3Dsprinter",
    );
  });

  it("não leva o fragmento", () => {
    expect(redirectFor("/dashboard?tab=perfil#share").searchParams.get("next")).toBe("/dashboard?tab=perfil");
  });

  it("o next continua passando pelo safeNext do login", () => {
    const next = redirectFor("/dashboard/selfie?moldura=sprinter").searchParams.get("next");
    expect(safeNext(next)).toBe("/dashboard/selfie?moldura=sprinter");
  });
});
