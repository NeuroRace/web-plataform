import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import type { ShareCardData } from "@/lib/share-card";

type RpcArgs = { p_metric?: string; p_limit?: number; p_from?: string; p_to?: string };
type Window = { id: string; name: string; starts_at: string; ends_at: string };

const mocks = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: null as any,
}));

// O Satori não roda no teste: a rota devolve o elemento que iria virar PNG.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(
      public element: ReactElement<{ card: ShareCardData }>,
      public init: unknown,
    ) {}
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/lib/supabase/dashboard", () => ({
  loadOwnRaces: async () => ({
    displayName: "Breq",
    summaries: [{ startedAt: new Date().toISOString(), metrics: { durationSeconds: 21, avgAttention: 60 } }],
  }),
}));

import { GET } from "./route";

// Ranking de sempre: o Breq é 3º por causa de corridas antigas. No evento, é o 1º.
const ALL_TIME = [
  { rank: 1, display_name: "Antigo", score: 15 },
  { rank: 2, display_name: "Outro", score: 18 },
  { rank: 3, display_name: "Breq", score: 21 },
];
const EVENT = [{ rank: 1, display_name: "Breq", score: 21 }];

function fakeClient(windows: Window[]) {
  const rpc = vi.fn(async (_name: string, args: RpcArgs) => ({
    data: args.p_from ? EVENT : ALL_TIME,
    error: null,
  }));
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ select: () => ({ order: async () => ({ data: windows, error: null }) }) }),
    rpc,
  };
}

const hour = 60 * 60 * 1000;
const rodada1: Window = {
  id: "1",
  name: "Rodada 1",
  starts_at: new Date(Date.now() - hour).toISOString(),
  ends_at: new Date(Date.now() + hour).toISOString(),
};

async function cardRank(): Promise<number | null> {
  const res = (await GET(new Request("http://localhost/dashboard/compartilhar"))) as unknown as {
    element: ReactElement<{ card: ShareCardData }>;
  };
  return res.element.props.card.rank;
}

describe("GET /dashboard/compartilhar", () => {
  beforeEach(() => {
    mocks.client = fakeClient([rodada1]);
  });

  it("posição do card é a do ranking do evento (desde a 1ª rodada), a mesma do telão", async () => {
    expect(await cardRank()).toBe(1);
    expect(mocks.client.rpc).toHaveBeenCalledWith(
      "get_leaderboard",
      expect.objectContaining({ p_metric: "best_time", p_from: rodada1.starts_at }),
    );
  });

  it("sem rodadas cadastradas, usa o ranking geral, como a aba Evento", async () => {
    mocks.client = fakeClient([]);
    expect(await cardRank()).toBe(3);
  });

  it("sem sessão responde 401", async () => {
    mocks.client = { ...fakeClient([rodada1]), auth: { getUser: async () => ({ data: { user: null } }) } };
    const res = await GET(new Request("http://localhost/dashboard/compartilhar"));
    expect((res as Response).status).toBe(401);
  });
});
