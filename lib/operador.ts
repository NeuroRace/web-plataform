/**
 * Painel de ops da premiação (NEU-114). Lógica pura: conferir o formato do que o banco
 * devolve, traduzir estado em rótulo e cor, e decidir que ações cada prêmio aceita.
 *
 * Contrato proposto à NEU-167/168 no comentário da NEU-114 (21/10):
 *   op_painel() -> jsonb { agora, config, premios[], registro[] }
 *   op_validar_codigo(p_codigo) -> jsonb { resultado, ... }
 *   op_acao(p_premio, p_acao, p_motivo) -> jsonb { ok, erro? }
 *   op_config(p_mudancas) -> jsonb (config)
 * Os tipos foram escritos à mão: tudo é conferido em tempo de execução.
 */
import { formatEventTime } from "./ranking";

/** O painel busca de novo a cada 10 s, só com a aba visível. */
export const PAINEL_REFRESH_MS = 10_000;

export type OpConfig = {
  premiacao_ligada: boolean;
  pausa_geral: boolean;
  passar_sozinho: boolean;
  carencia_min: number;
  janela_min: number;
  lembrete_min: number;
  limite_fila: number;
  ligada_em: string | null;
  evento_atual: string;
};

export type OpPremio = {
  id: string;
  round_id: string;
  round_name: string;
  round_ends_at: string;
  /** Posição na fila (1 a 5) de quem tem ou teve o prêmio. */
  posicao: number;
  display_name: string;
  /** Já mascarado pelo banco: o contato completo nunca chega ao celular do operador. */
  contato: string | null;
  score: number | null;
  atencao_media: number | null;
  /** Texto: estado novo no banco não pode quebrar a tela. */
  status: string;
  prazo: string | null;
  entregue_em: string | null;
  sem_canal: boolean;
};

export type OpRegistro = {
  em: string;
  operador: string;
  acao: string;
  round_name: string | null;
  detalhe: string | null;
};

export type OpPainel = {
  agora: string;
  config: OpConfig;
  premios: OpPremio[];
  registro: OpRegistro[];
  /** Prêmios que vieram fora do formato: a tela avisa, em vez de sumir com eles. */
  descartados: number;
};

export type OpAcao =
  | "mais_10_min"
  | "passar"
  | "entregue_sem_codigo"
  | "cancelar"
  | "continuar"
  | "sortear"
  | "guardar";

export const ACAO_LABEL: Record<OpAcao, string> = {
  mais_10_min: "+10 min",
  passar: "Passar",
  entregue_sem_codigo: "Entregue sem código",
  cancelar: "Cancelar",
  continuar: "Continuar a fila",
  sortear: "Sortear",
  guardar: "Guardar o prêmio",
};

/** Ações que pedem motivo, gravado no registro. */
export const ACAO_COM_MOTIVO: ReadonlySet<OpAcao> = new Set(["entregue_sem_codigo", "cancelar"]);

const isText = (v: unknown): v is string => typeof v === "string";
const isTextOrNull = (v: unknown): v is string | null => v === null || isText(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumOrNull = (v: unknown): v is number | null => v === null || isNum(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isConfig(v: unknown): v is OpConfig {
  if (!isObj(v)) return false;
  return (
    isBool(v.premiacao_ligada) &&
    isBool(v.pausa_geral) &&
    isBool(v.passar_sozinho) &&
    isNum(v.carencia_min) &&
    isNum(v.janela_min) &&
    isNum(v.lembrete_min) &&
    isNum(v.limite_fila) &&
    isTextOrNull(v.ligada_em) &&
    isText(v.evento_atual)
  );
}

function isPremio(v: unknown): v is OpPremio {
  if (!isObj(v)) return false;
  return (
    isText(v.id) &&
    isText(v.round_id) &&
    isText(v.round_name) &&
    isText(v.round_ends_at) &&
    isNum(v.posicao) &&
    isText(v.display_name) &&
    isTextOrNull(v.contato) &&
    isNumOrNull(v.score) &&
    isNumOrNull(v.atencao_media) &&
    isText(v.status) &&
    isTextOrNull(v.prazo) &&
    isTextOrNull(v.entregue_em) &&
    isBool(v.sem_canal)
  );
}

function isRegistro(v: unknown): v is OpRegistro {
  if (!isObj(v)) return false;
  return (
    isText(v.em) &&
    isText(v.operador) &&
    isText(v.acao) &&
    isTextOrNull(v.round_name) &&
    isTextOrNull(v.detalhe)
  );
}

/**
 * Painel fora do contrato → null. Prêmio ou registro fora do formato é descartado, e os
 * prêmios descartados são contados: um prêmio que some em silêncio é justo o que pedia ação.
 */
export function parsePainel(data: unknown): OpPainel | null {
  if (!isObj(data) || !isText(data.agora) || !isConfig(data.config)) return null;
  if (!Array.isArray(data.premios) || !Array.isArray(data.registro)) return null;
  const premios = data.premios.filter(isPremio);
  return {
    agora: data.agora,
    config: data.config,
    premios,
    registro: data.registro.filter(isRegistro),
    descartados: data.premios.length - premios.length,
  };
}

export function parseConfig(data: unknown): OpConfig | null {
  return isConfig(data) ? data : null;
}

export type Tone = "ok" | "wait" | "alert" | "warn" | "done" | "muted";

export type StatusView = {
  label: string;
  tone: Tone;
  /** "mm:ss" até o prazo, enquanto corre. */
  countdown: string | null;
  note: string | null;
};

const OPEN = new Set(["avisando", "avisado", "prazo_estourou", "aviso_falhou"]);

const NEUTRAL: Record<string, string> = {
  avisando: "Avisando…",
  passou: "Passou",
  recusado: "Recusou",
  cancelado: "Cancelado",
  aguardando_fechamento: "Aguardando fechamento",
};

/**
 * Estado → rótulo e cor. `now` já vem corrigido pelo relógio do servidor. Um prazo que
 * vence entre duas buscas fica vermelho na hora, sem esperar o banco mudar o estado.
 */
export function statusView(p: OpPremio, now: number): StatusView {
  const note = p.sem_canal ? "Sem canal: avise pessoalmente" : null;
  const left = p.prazo ? Date.parse(p.prazo) - now : null;
  const late = p.status === "prazo_estourou" || (p.status === "avisado" && left !== null && left <= 0);

  if (late) return { label: "Prazo estourou", tone: "alert", countdown: null, note: note ?? "O código ainda vale" };
  if (p.status === "avisado") {
    return { label: "Avisado", tone: "ok", countdown: left === null ? null : formatCountdown(left), note };
  }
  if (p.status === "aviso_falhou") return { label: "Aviso falhou", tone: "alert", countdown: null, note };
  if (p.status === "sem_retirada") return { label: "Sem retirada", tone: "alert", countdown: null, note };
  if (p.status === "entregue") {
    const at = p.entregue_em ? ` às ${formatEventTime(p.entregue_em)}` : "";
    return { label: `Entregue${at}`, tone: "done", countdown: null, note: null };
  }
  if (p.status in NEUTRAL) {
    return { label: NEUTRAL[p.status], tone: p.status === "avisando" ? "wait" : "muted", countdown: null, note };
  }
  return { label: p.status, tone: "muted", countdown: null, note };
}

/** Ações por estado: em aberto, as do operador; depois do 5º, o que fazer com o prêmio. */
export function actionsFor(p: OpPremio): OpAcao[] {
  if (OPEN.has(p.status)) return ["mais_10_min", "passar", "entregue_sem_codigo", "cancelar"];
  if (p.status === "sem_retirada") return ["continuar", "sortear", "guardar"];
  return [];
}

export type CodeReply = { tone: Tone; title: string; detail: string | null };

const secondsFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Resposta de `op_validar_codigo` → o que aparece grande na tela. Fora do contrato → null. */
export function codeReplyView(data: unknown): CodeReply | null {
  if (!isObj(data) || !isText(data.resultado)) return null;
  const name = isText(data.display_name) ? data.display_name : null;
  const round = isText(data.round_name) ? data.round_name : null;
  const at = isText(data.entregue_em) ? formatEventTime(data.entregue_em) : null;

  switch (data.resultado) {
    case "entregue":
      return { tone: "ok", title: "Entregue", detail: [name, round, at].filter(Boolean).join(" · ") || null };
    case "ja_entregue":
      return { tone: "warn", title: at ? `Já entregue às ${at}` : "Já entregue", detail: name };
    case "invalido":
      return { tone: "alert", title: "Código errado", detail: "Confira os 6 dígitos com a pessoa" };
    case "espere":
      return {
        tone: "warn",
        title: "Muitas tentativas",
        detail: isText(data.espere_ate) ? `Tente de novo às ${secondsFmt.format(new Date(data.espere_ate))}` : null,
      };
    default:
      return null;
  }
}

/** "10:05" até o prazo, arredondando para cima (como todo regressivo); vencido fica "0:00". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Tempo com milésimo ("48,312 s"), só para explicar um empate. */
export function formatScoreExact(score: number | null): string {
  if (score === null) return "—";
  return `${score.toFixed(3).replace(".", ",")} s`;
}

export type RoundGroup = { round_id: string; round_name: string; round_ends_at: string; premios: OpPremio[] };

/** Rodadas na ordem em que o banco mandou (mais recente primeiro), cada fila do 1º ao 5º. */
export function groupByRound(premios: readonly OpPremio[]): RoundGroup[] {
  const groups = new Map<string, RoundGroup>();
  for (const p of premios) {
    const g = groups.get(p.round_id) ?? {
      round_id: p.round_id,
      round_name: p.round_name,
      round_ends_at: p.round_ends_at,
      premios: [],
    };
    g.premios.push(p);
    groups.set(p.round_id, g);
  }
  return [...groups.values()].map((g) => ({ ...g, premios: g.premios.sort((a, b) => a.posicao - b.posicao) }));
}
