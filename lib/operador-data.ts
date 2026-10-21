import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  codeReplyView,
  parseConfig,
  parsePainel,
  type CodeReply,
  type OpAcao,
  type OpConfig,
  type OpPainel,
} from "./operador";

type Client = SupabaseClient<Database>;

/**
 * `sem_acesso`: a conta não está na lista de operadores (42501, NEU-168).
 * `fora_do_ar`: as funções ainda não estão no banco (PGRST202): a premiação não está no ar.
 * `erro`: qualquer outra falha ou resposta fora do contrato; a tela mantém o que já mostra.
 */
export type OpErro = "sem_acesso" | "fora_do_ar" | "erro";
export type OpResult<T> = { ok: true; data: T } | { ok: false; erro: OpErro };

const DENIED = "42501";
const MISSING_FUNCTION = "PGRST202";

function fail(fn: string, error: { code?: string; message?: string }): { ok: false; erro: OpErro } {
  if (error.code === DENIED) return { ok: false, erro: "sem_acesso" };
  if (error.code === MISSING_FUNCTION) {
    console.warn(`${fn} indisponível`, error.code);
    return { ok: false, erro: "fora_do_ar" };
  }
  console.error(`${fn} falhou`, error.code, error.message);
  return { ok: false, erro: "erro" };
}

function offContract(fn: string): { ok: false; erro: OpErro } {
  console.error(`${fn}: formato fora do contrato`);
  return { ok: false, erro: "erro" };
}

export async function loadPainel(sb: Client): Promise<OpResult<OpPainel>> {
  const { data, error } = await sb.rpc("op_painel");
  if (error) return fail("op_painel", error);
  const painel = parsePainel(data);
  return painel ? { ok: true, data: painel } : offContract("op_painel");
}

/** Só os dígitos: o operador digita "12 34 56" ou cola com traço. O código nunca vai para o log. */
export async function validarCodigo(sb: Client, codigo: string): Promise<OpResult<CodeReply>> {
  const { data, error } = await sb.rpc("op_validar_codigo", { p_codigo: codigo.replace(/\D/g, "") });
  if (error) return fail("op_validar_codigo", error);
  const reply = codeReplyView(data);
  return reply ? { ok: true, data: reply } : offContract("op_validar_codigo");
}

/** `feito: false` traz a frase do banco para mostrar (ex.: "Falta o motivo"). */
export async function executarAcao(
  sb: Client,
  premio: string,
  acao: OpAcao,
  motivo?: string,
): Promise<OpResult<{ feito: boolean; mensagem: string | null }>> {
  const { data, error } = await sb.rpc("op_acao", {
    p_premio: premio,
    p_acao: acao,
    p_motivo: motivo?.trim() || null,
  });
  if (error) return fail("op_acao", error);
  if (typeof data !== "object" || data === null || Array.isArray(data)) return offContract("op_acao");
  const res = data as { ok?: unknown; erro?: unknown };
  if (typeof res.ok !== "boolean") return offContract("op_acao");
  return { ok: true, data: { feito: res.ok, mensagem: typeof res.erro === "string" ? res.erro : null } };
}

/** Merge parcial no banco: manda só o que mudou e recebe a config inteira já gravada. */
export async function mudarConfig(sb: Client, mudancas: Partial<OpConfig>): Promise<OpResult<OpConfig>> {
  const { data, error } = await sb.rpc("op_config", { p_mudancas: mudancas as Json });
  if (error) return fail("op_config", error);
  const config = parseConfig(data);
  return config ? { ok: true, data: config } : offContract("op_config");
}
