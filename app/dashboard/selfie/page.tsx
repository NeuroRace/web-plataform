import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnRaces } from "@/lib/supabase/dashboard";
import { FRAMES } from "@/lib/collection/catalog";
import { computeUnlocks } from "@/lib/collection/unlocks";
import { SelfieStudio } from "@/components/collection/SelfieStudio";

export const metadata: Metadata = { title: "Foto com moldura" };

export const dynamic = "force-dynamic";

/** Selfie com moldura (NEU-125): só as molduras que a pessoa já desbloqueou. */
export default async function SelfiePage({ searchParams }: { searchParams: Promise<{ moldura?: string }> }) {
  const { moldura } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/selfie");

  const { summaries } = await loadOwnRaces(supabase, user.id);
  const unlocked = new Set(computeUnlocks(summaries, user.created_at ?? null).map((u) => u.id));
  const frameIds = FRAMES.filter((f) => unlocked.has(f.id)).map((f) => f.id);
  const initialId = moldura && frameIds.includes(moldura) ? moldura : "neurorace";

  return <SelfieStudio frameIds={frameIds} initialId={initialId} />;
}
