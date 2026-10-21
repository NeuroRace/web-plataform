import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPainel } from "@/lib/operador-data";
import { OperadorPanel } from "@/components/operador/OperadorPanel";

export const metadata: Metadata = {
  title: "Operador",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Painel de ops da premiação (NEU-114). Separado do painel do estande: se esta tela
 * quebrar, o jogo não sente. Quem pode agir é o banco que decide (NEU-168): aqui só
 * exige uma sessão.
 */
export default async function OperadorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/operador");

  const initial = await loadPainel(supabase);
  return <OperadorPanel initial={initial} operador={user.email ?? null} />;
}
