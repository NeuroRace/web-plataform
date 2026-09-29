import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { loadOwnRaces } from "@/lib/supabase/dashboard";
import { buildArchetypeCard, buildShareCard, mascotFor } from "@/lib/share-card";
import { qrSvg } from "@/lib/qr";
import { site } from "@/lib/site";
import { ArchetypeCardImage, ShareCardImage } from "@/components/share/ShareCardImage";

export const dynamic = "force-dynamic";

// Do disco, não por URL do próprio site: em preview protegido da Vercel o servidor
// buscando a si mesmo toma 401 e o Satori quebra.
async function pngDataUri(file: string): Promise<string> {
  const data = await readFile(join(process.cwd(), "public", "assets", "images", file));
  return `data:image/png;base64,${data.toString("base64")}`;
}

/**
 * PNG 1080×1920 (Stories) com o desempenho do usuário logado (NEU-88).
 * `?modelo=arquetipo`: arquétipo e badges do NeuroCoach; sem parâmetro, o melhor tempo.
 * Só dados dele (RLS), sem e-mail e sem curva de EEG. Fica sob /dashboard, então o
 * proxy já barra quem não tem sessão; o 401 aqui é a segunda trava.
 */
export async function GET(request: Request) {
  const modelo = new URL(request.url).searchParams.get("modelo");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const [{ summaries, displayName }, leaderboard, qr, logo] = await Promise.all([
    loadOwnRaces(supabase, user.id),
    supabase.rpc("get_leaderboard", { p_metric: "best_time", p_limit: 1000 }),
    qrSvg(site.url),
    pngDataUri("logo-icon.png"),
  ]);
  if (summaries.length === 0) return new Response("Sem corridas", { status: 404 });

  const input = { displayName, races: summaries, leaderboard: leaderboard.data ?? [] };
  const common = {
    logoSrc: logo,
    qrSrc: `data:image/svg+xml;base64,${Buffer.from(qr).toString("base64")}`,
    host: new URL(site.url).host,
  };

  let image;
  if (modelo === "arquetipo") {
    const card = buildArchetypeCard(input);
    if (!card) return new Response("Sem corrida com dados suficientes", { status: 404 });
    const mascot = await pngDataUri(mascotFor(card.archetype.id));
    image = <ArchetypeCardImage card={card} mascotSrc={mascot} {...common} />;
  } else {
    const mascot = await pngDataUri("mascot-winner.png");
    image = <ShareCardImage card={buildShareCard(input)} mascotSrc={mascot} {...common} />;
  }

  return new ImageResponse(image, {
    width: 1080,
    height: 1920,
    headers: { "Cache-Control": "private, no-store" },
  });
}
