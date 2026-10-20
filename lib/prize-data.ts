import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parsePrizeRows, type PrizeRow } from "./prize";

type Client = SupabaseClient<Database>;

/** `missing`: a função não está disponível no banco; não adianta buscar de novo nesta página. */
export type PrizeLoad = { ok: true; rows: PrizeRow[] } | { ok: false; missing: boolean };

// Nenhuma função com esse nome e essa assinatura no schema cache do PostgREST.
const MISSING_FUNCTION = "PGRST202";

/**
 * Prêmios da conta logada (NEU-171). A função não recebe id: o banco filtra pela
 * sessão, então ninguém pede o código de outra pessoa.
 *
 * Na tela, erro e "sem prêmio" são iguais (o cartão não aparece), então tudo que não
 * for sucesso vai para o console. PGRST202 é aviso, não erro: é o estado normal antes
 * da NEU-167, mas também aparece se ela sair com outra assinatura.
 */
export async function loadMyPrize(sb: Client): Promise<PrizeLoad> {
  const { data, error } = await sb.rpc("get_my_prize");
  if (error) {
    const missing = error.code === MISSING_FUNCTION;
    if (missing) console.warn("get_my_prize indisponível", error.code, error.message);
    else console.error("get_my_prize falhou", error.code, error.message);
    return { ok: false, missing };
  }
  const rows = parsePrizeRows(data ?? []);
  if (!rows) {
    console.error("get_my_prize: formato fora do contrato");
    return { ok: false, missing: false };
  }
  return { ok: true, rows };
}
