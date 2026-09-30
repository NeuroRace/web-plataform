import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { flat, makeRace } from "@/lib/coach/test-utils";
import type { RaceSummary } from "@/lib/metrics";

type Props = { frameIds: string[]; initialId: string };

const mocks = vi.hoisted(() => ({
  user: null as { id: string; created_at: string } | null,
  races: [] as RaceSummary[],
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }),
}));
vi.mock("@/lib/supabase/dashboard", () => ({
  loadOwnRaces: async () => ({ displayName: "Pedro", summaries: mocks.races }),
}));

import SelfiePage from "./page";

async function render(moldura?: string): Promise<Props> {
  const el = (await SelfiePage({ searchParams: Promise.resolve({ moldura }) })) as ReactElement<Props>;
  return el.props;
}

beforeEach(() => {
  mocks.user = { id: "u1", created_at: "2026-09-27T15:00:00.000Z" };
  // Foco 70: desbloqueia a moldura Hiperfocado.
  mocks.races = [makeRace(flat(70, 30))];
});

describe("página da selfie (NEU-125)", () => {
  it("test_SelfieAuth_sem_sessao_vai_para_o_login", async () => {
    mocks.user = null;
    await expect(render()).rejects.toThrow("REDIRECT /login?next=/dashboard/selfie");
  });

  it("test_SelfieOnlyUnlocked_carrossel_so_tem_molduras_desbloqueadas", async () => {
    expect((await render()).frameIds).toEqual(["neurorace", "hiperfocado"]);
  });

  it("test_SelfiePreselect_abre_na_moldura_pedida_se_desbloqueada", async () => {
    expect((await render("hiperfocado")).initialId).toBe("hiperfocado");
  });

  it("test_SelfiePreselectLocked_moldura_bloqueada_cai_na_NeuroRace", async () => {
    expect((await render("mestre-zen")).initialId).toBe("neurorace");
    expect((await render("nao-existe")).initialId).toBe("neurorace");
  });
});
