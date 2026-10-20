import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PrizeRow } from "./prize";

type Client = SupabaseClient<Database>;

/**
 * Prêmios da conta logada (NEU-171). A função não recebe id: o banco filtra pela
 * sessão, então ninguém pede o código de outra pessoa.
 *
 * null = a busca falhou, inclusive com a função ainda não publicada (NEU-167).
 * Quem chama mantém o que já mostrava; sem nada antes, o painel fica como hoje.
 */
export async function loadMyPrize(sb: Client): Promise<PrizeRow[] | null> {
  const { data, error } = await sb.rpc("get_my_prize");
  if (error) return null;
  return data ?? [];
}
