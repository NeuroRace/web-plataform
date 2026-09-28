import { describe, expect, it, vi } from "vitest";
import { loadRanking } from "./ranking-data";
import type { RankingWindow } from "./ranking";

type RpcArgs = { p_metric?: string; p_limit?: number; p_from?: string; p_to?: string };

/** Supabase falso: só o que loadRanking usa (from().select().order() e rpc()). */
function fakeClient(opts: {
  windows?: RankingWindow[] | "missing" | "down";
  rpc?: (args: RpcArgs) => { data: unknown; error: unknown };
}) {
  const rpc = vi.fn(async (_name: string, args: RpcArgs) =>
    opts.rpc
      ? opts.rpc(args)
      : { data: [{ rank: 1, display_name: "Breq", score: 30 }], error: null },
  );
  const order = vi.fn(async () =>
    opts.windows === "missing"
      ? { data: null, error: { code: "PGRST205", message: "not found in the schema cache" } }
      : opts.windows === "down"
        ? { data: null, error: { code: "", message: "HTTP 500" } }
        : { data: opts.windows ?? [], error: null },
  );
  const client = {
    from: () => ({ select: () => ({ order }) }),
    rpc,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, rpc };
}

const r1: RankingWindow = {
  id: "1",
  name: "Rodada 1",
  starts_at: "2026-09-30T10:00:00-03:00",
  ends_at: "2026-09-30T12:00:00-03:00",
};
const r2: RankingWindow = {
  id: "2",
  name: "Rodada 2",
  starts_at: "2026-09-30T12:00:00-03:00",
  ends_at: "2026-09-30T14:00:00-03:00",
};
const noon30 = new Date("2026-09-30T12:30:00-03:00");

describe("loadRanking", () => {
  it("sem a tabela de rodadas (antes da NEU-110) usa a chamada de hoje, sem período", async () => {
    const { client, rpc } = fakeClient({ windows: "missing" });
    const snap = await loadRanking(client, noon30);

    expect(snap.windows).toBeNull();
    expect(snap.round).toBeNull();
    expect(snap.event.rows).toHaveLength(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_leaderboard", { p_metric: "best_time", p_limit: 50 });
    expect(snap.failed).toBe(false);
  });

  it("falha na busca das rodadas (não é tabela inexistente): snapshot marcado como falho", async () => {
    const { client } = fakeClient({ windows: "down" });
    const snap = await loadRanking(client, noon30);

    expect(snap.failed).toBe(true);
    expect(snap.windows).toBeNull();
  });

  it("com rodadas: evento desde a 1ª rodada, rodada atual com período e vencedor da anterior", async () => {
    const { client, rpc } = fakeClient({ windows: [r1, r2] });
    const snap = await loadRanking(client, noon30);

    expect(snap.windows?.current?.id).toBe("2");
    expect(snap.round?.rows).toHaveLength(1);
    expect(snap.previousWinner?.display_name).toBe("Breq");
    expect(snap.failed).toBe(false);

    const calls = rpc.mock.calls.map(([, args]) => args);
    expect(calls).toContainEqual({ p_metric: "best_time", p_limit: 50, p_from: r1.starts_at });
    expect(calls).toContainEqual({
      p_metric: "best_time",
      p_limit: 50,
      p_from: r2.starts_at,
      p_to: r2.ends_at,
    });
    expect(calls).toContainEqual({
      p_metric: "best_time",
      p_limit: 1,
      p_from: r1.starts_at,
      p_to: r1.ends_at,
    });
  });

  it("deploy parcial (tabela nova, função antiga): cai no ranking geral sem período", async () => {
    const { client } = fakeClient({
      windows: [r1, r2],
      rpc: (args) =>
        args.p_from
          ? { data: null, error: { code: "PGRST202" } }
          : { data: [{ rank: 1, display_name: "Ester", score: 40 }], error: null },
    });
    const snap = await loadRanking(client, noon30);

    expect(snap.windows).toBeNull();
    expect(snap.event).toEqual({
      rows: [{ rank: 1, display_name: "Ester", score: 40 }],
      error: false,
    });
    expect(snap.failed).toBe(false);
  });

  it("outra falha no evento com período não cai no ranking geral: mantém rodadas e marca falha", async () => {
    const { client, rpc } = fakeClient({
      windows: [r1, r2],
      rpc: (args) =>
        args.p_from === r1.starts_at && !args.p_to
          ? { data: null, error: { code: "", message: "HTTP 500" } }
          : { data: [{ rank: 1, display_name: "Breq", score: 30 }], error: null },
    });
    const snap = await loadRanking(client, noon30);

    expect(snap.windows?.current?.id).toBe("2");
    expect(snap.event.error).toBe(true);
    expect(snap.failed).toBe(true);
    // Nenhuma busca sem período (que traria o ranking de sempre).
    expect(rpc.mock.calls.every(([, args]) => args.p_from)).toBe(true);
  });

  it("falha só na rodada atual ou no vencedor anterior também marca o snapshot", async () => {
    for (const failing of [r2, r1]) {
      const { client } = fakeClient({
        windows: [r1, r2],
        rpc: (args) =>
          args.p_from === failing.starts_at && args.p_to === failing.ends_at
            ? { data: null, error: { code: "", message: "HTTP 500" } }
            : { data: [{ rank: 1, display_name: "Breq", score: 30 }], error: null },
      });
      const snap = await loadRanking(client, noon30);
      expect(snap.event.error).toBe(false);
      expect(snap.failed).toBe(true);
    }
  });

  it("erro na busca do ranking vira error=true, sem lançar", async () => {
    const { client } = fakeClient({
      windows: "missing",
      rpc: () => ({ data: null, error: { message: "boom" } }),
    });
    const snap = await loadRanking(client, noon30);
    expect(snap.event).toEqual({ rows: [], error: true });
    expect(snap.failed).toBe(true);
  });

  it("repassa o limite (telão mostra menos linhas)", async () => {
    const { client, rpc } = fakeClient({ windows: "missing" });
    await loadRanking(client, noon30, { limit: 10 });
    expect(rpc).toHaveBeenCalledWith("get_leaderboard", { p_metric: "best_time", p_limit: 10 });
  });
});
