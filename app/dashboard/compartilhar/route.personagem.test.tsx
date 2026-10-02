import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { flat, makeRace } from "@/lib/coach/test-utils";

type Props = { mascotSrc: string; card: { archetype?: { id: string } } };

vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(public element: ReactElement<Props>) {}
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }),
    rpc: async () => ({ data: [], error: null }),
  }),
}));
// Foco 70 constante: o NeuroCoach classifica como Hiperfocado.
vi.mock("@/lib/supabase/dashboard", () => ({
  loadOwnRaces: async () => ({ displayName: "Pedro", summaries: [makeRace(flat(70, 30))] }),
}));

import { GET } from "./route";

function dataUri(rel: string): string {
  return `data:image/png;base64,${readFileSync(join(process.cwd(), "public", rel)).toString("base64")}`;
}

async function element(url: string): Promise<ReactElement<Props>> {
  const res = (await GET(new Request(url))) as unknown as { element: ReactElement<Props> };
  return res.element;
}

describe("card dos Stories com o personagem do arquétipo (NEU-134)", () => {
  it("test_CardCharacter_modelo_arquetipo_usa_o_personagem_do_arquetipo", async () => {
    const el = await element("http://localhost/dashboard/compartilhar?modelo=arquetipo");
    expect(el.props.card.archetype?.id).toBe("HIPERFOCADO");
    expect(el.props.mascotSrc).toBe(dataUri("assets/colecao/personagem-hiperfocado.png"));
  });

  it("test_CardDefaultUnchanged_modelo_padrao_segue_com_o_mascote_de_sempre", async () => {
    const el = await element("http://localhost/dashboard/compartilhar");
    expect(el.props.mascotSrc).toBe(dataUri("assets/images/mascot-winner.png"));
  });
});
