import { describe, it, expect, vi } from "vitest";
import { loadOwnTelemetry } from "@/lib/supabase/telemetry";

type Row = { race_player_id: string; t: string; attention: number; meditation: number };
const row = (i: number): Row => ({ race_player_id: "rp", t: `2026-09-30T17:00:${String(i).padStart(2, "0")}.000Z`, attention: i, meditation: 50 });

/** Fake do encadeamento from().select().order().range() do supabase-js. */
function fakeClient(total: number, opts: { failOnPage?: number } = {}) {
  const ranges: Array<[number, number]> = [];
  const orders: string[] = [];
  let page = 0;
  const client = {
    from: vi.fn(() => ({
      select: () => ({
        order: (col: string) => {
          orders.push(col);
          return {
            range: async (from: number, to: number) => {
              ranges.push([from, to]);
              if (opts.failOnPage === page++) return { data: null, error: { message: "boom" } };
              const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, k) => row(from + k));
              return { data, error: null };
            },
          };
        },
      }),
    })),
  };
  return { client, ranges, orders };
}

describe("loadOwnTelemetry — paginado (PostgREST corta em 1000 linhas)", () => {
  it("junta todas as páginas até a última incompleta, em ordem estável por id", async () => {
    const { client, ranges, orders } = fakeClient(7);
    const rows = await loadOwnTelemetry(client as never, 3);
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.attention)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(ranges).toEqual([[0, 2], [3, 5], [6, 8]]);
    expect(new Set(orders)).toEqual(new Set(["id"]));
  });

  it("total múltiplo do tamanho da página: para na página vazia", async () => {
    const { client, ranges } = fakeClient(6);
    expect(await loadOwnTelemetry(client as never, 3)).toHaveLength(6);
    expect(ranges).toHaveLength(3);
  });

  it("erro em qualquer página lança", async () => {
    const { client } = fakeClient(7, { failOnPage: 1 });
    await expect(loadOwnTelemetry(client as never, 3)).rejects.toThrow();
  });
});
