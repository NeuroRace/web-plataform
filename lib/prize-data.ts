import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PrizeRow } from "./prize";

type Client = SupabaseClient<Database>;

/** `missing`: a função ainda não existe no banco (NEU-167 não publicada); não adianta buscar de novo. */
export type PrizeLoad = { ok: true; rows: PrizeRow[] } | { ok: false; missing: boolean };

// Nenhuma função com esse nome no schema cache do PostgREST.
const MISSING_FUNCTION = "PGRST202";

/**
 * Prêmios da conta logada (NEU-171). A função não recebe id: o banco filtra pela
 * sessão, então ninguém pede o código de outra pessoa.
 *
 * Falha que não seja a função ausente vai para o console: na tela, erro e "sem prêmio"
 * são iguais (o cartão não aparece), e um grant ou RLS errado sumiria em silêncio.
 */
export async function loadMyPrize(sb: Client): Promise<PrizeLoad> {
  const { data, error } = await sb.rpc("get_my_prize");
  if (error) {
    const missing = error.code === MISSING_FUNCTION;
    if (!missing) console.error("get_my_prize falhou", error.code, error.message);
    return { ok: false, missing };
  }
  return { ok: true, rows: data ?? [] };
}
