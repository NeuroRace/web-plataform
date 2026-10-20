import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadMyPrize } from "@/lib/prize-data";
import type { PrizeRow } from "@/lib/prize";

const fakeClient = (result: { data: unknown; error: { code: string; message?: string } | null }) => {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
};

const ROW: PrizeRow = {
  round_name: "Rodada 2",
  status: "avisado",
  code: "482913",
  claim_deadline: "2026-10-24T18:20:00Z",
  delivered_at: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadMyPrize", () => {
  it("devolve as linhas da função", async () => {
    const { client } = fakeClient({ data: [ROW], error: null });
    expect(await loadMyPrize(client)).toEqual({ ok: true, rows: [ROW] });
  });

  it("sem linhas -> lista vazia", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await loadMyPrize(client)).toEqual({ ok: true, rows: [] });
  });

  it("função ainda não publicada (NEU-167): marca como ausente, sem barulho no console", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: { code: "PGRST202" } });
    expect(await loadMyPrize(client)).toEqual({ ok: false, missing: true });
    expect(log).not.toHaveBeenCalled();
  });

  it("outro erro (grant ou RLS errado na 167): falha e aparece no console", async () => {
    // Sem o log, "erro" e "sem prêmio" ficam iguais na tela e a simulação não mostra o motivo.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = fakeClient({
      data: null,
      error: { code: "42501", message: "permission denied for function get_my_prize" },
    });
    expect(await loadMyPrize(client)).toEqual({ ok: false, missing: false });
    expect(log).toHaveBeenCalledWith(
      "get_my_prize falhou",
      "42501",
      "permission denied for function get_my_prize",
    );
  });

  it("não manda id de ninguém: quem filtra é o banco, pela sessão", async () => {
    const { client, rpc } = fakeClient({ data: [], error: null });
    await loadMyPrize(client);
    expect(rpc).toHaveBeenCalledWith("get_my_prize");
  });
});
