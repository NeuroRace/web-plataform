import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadMyPrize } from "@/lib/prize-data";
import type { PrizeRow } from "@/lib/prize";

const fakeClient = (result: { data: unknown; error: { code: string } | null }) => {
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

describe("loadMyPrize", () => {
  it("devolve as linhas da função", async () => {
    const { client } = fakeClient({ data: [ROW], error: null });
    expect(await loadMyPrize(client)).toEqual([ROW]);
  });

  it("sem linhas -> lista vazia", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await loadMyPrize(client)).toEqual([]);
  });

  it("função ainda não publicada (NEU-167) ou erro -> null, e o painel fica como hoje", async () => {
    const { client } = fakeClient({ data: null, error: { code: "PGRST202" } });
    expect(await loadMyPrize(client)).toBeNull();
  });

  it("não manda id de ninguém: quem filtra é o banco, pela sessão", async () => {
    const { client, rpc } = fakeClient({ data: [], error: null });
    await loadMyPrize(client);
    expect(rpc).toHaveBeenCalledWith("get_my_prize");
  });
});
