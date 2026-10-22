import { describe, expect, it } from "vitest";
import {
  actionsFor,
  codeReplyView,
  formatCountdown,
  formatScoreExact,
  groupByRound,
  parsePainel,
  statusView,
  type OpPremio,
} from "./operador";

const premio = (over: Partial<OpPremio> = {}): OpPremio => ({
  id: "p1",
  round_id: "r3",
  round_name: "Rodada 3",
  round_ends_at: "2026-10-24T15:00:00-03:00",
  posicao: 1,
  display_name: "luna_zen",
  contato: "lu***@gmail.com",
  score: 48.312,
  atencao_media: 71.4,
  status: "avisado",
  prazo: "2026-10-24T15:20:00-03:00",
  entregue_em: null,
  sem_canal: false,
  ...over,
});

const at = (iso: string) => Date.parse(iso);

const painelJson = () => ({
  agora: "2026-10-24T15:10:00-03:00",
  config: {
    premiacao_ligada: true,
    pausa_geral: false,
    passar_sozinho: false,
    carencia_min: 5,
    janela_min: 15,
    lembrete_min: 10,
    limite_fila: 5,
    ligada_em: "2026-10-24T13:00:00-03:00",
    evento_atual: "NEXT 2026",
  },
  premios: [premio()],
  registro: [
    { em: "2026-10-24T15:08:00-03:00", operador: "pedro@x.com", acao: "passar", round_name: "Rodada 2", detalhe: null },
  ],
});

describe("parsePainel", () => {
  it("aceita o formato do contrato", () => {
    const p = parsePainel(painelJson());
    expect(p?.config.evento_atual).toBe("NEXT 2026");
    expect(p?.premios).toHaveLength(1);
    expect(p?.registro).toHaveLength(1);
  });

  it("config fora do formato → null (o painel não adivinha regra)", () => {
    expect(parsePainel({ ...painelJson(), config: { pausa_geral: "sim" } })).toBeNull();
    expect(parsePainel(null)).toBeNull();
    expect(parsePainel([])).toBeNull();
  });

  it("prêmio ou registro fora do formato é descartado, o resto fica", () => {
    const json = painelJson();
    const p = parsePainel({
      ...json,
      premios: [...json.premios, { id: 1, status: null }],
      registro: [...json.registro, "lixo"],
    });
    expect(p?.premios).toHaveLength(1);
    expect(p?.registro).toHaveLength(1);
    // O operador precisa saber que um prêmio não apareceu, não ver "nenhum prêmio".
    expect(p?.descartados).toBe(1);
  });

  it("tudo no formato: nenhum descartado", () => {
    expect(parsePainel(painelJson())?.descartados).toBe(0);
  });
});

describe("statusView", () => {
  it("avisado: contagem até o prazo", () => {
    const v = statusView(premio(), at("2026-10-24T15:10:00-03:00"));
    expect(v).toMatchObject({ label: "Avisado", tone: "ok", countdown: "10:00" });
  });

  it("avisado com o prazo vencido no relógio fica vermelho na hora, antes do banco mudar", () => {
    const v = statusView(premio(), at("2026-10-24T15:20:01-03:00"));
    expect(v).toMatchObject({ label: "Prazo estourou", tone: "alert", countdown: null });
  });

  it("prazo estourado: vermelho, e o código ainda vale", () => {
    const v = statusView(premio({ status: "prazo_estourou" }), at("2026-10-24T15:25:00-03:00"));
    expect(v).toMatchObject({ label: "Prazo estourou", tone: "alert" });
    expect(v.note).toBe("O código ainda vale");
  });

  it("aviso falhou e sem canal aparecem em destaque", () => {
    expect(statusView(premio({ status: "aviso_falhou", prazo: null }), 0)).toMatchObject({
      label: "Aviso falhou",
      tone: "alert",
    });
    expect(statusView(premio({ sem_canal: true }), at("2026-10-24T15:10:00-03:00")).note).toBe(
      "Sem canal: avise pessoalmente",
    );
  });

  it("entregue: com a hora", () => {
    const v = statusView(premio({ status: "entregue", entregue_em: "2026-10-24T15:12:00-03:00" }), 0);
    expect(v).toMatchObject({ label: "Entregue às 15:12", tone: "done" });
  });

  it("passou, recusado, cancelado e aguardando: neutros", () => {
    for (const [status, label] of [
      ["passou", "Passou"],
      ["recusado", "Recusou"],
      ["cancelado", "Cancelado"],
      ["aguardando_fechamento", "Aguardando fechamento"],
      ["avisando", "Avisando…"],
    ]) {
      expect(statusView(premio({ status, prazo: null }), 0).label).toBe(label);
    }
  });

  it("sem retirada depois do 5º: alerta para o operador decidir", () => {
    expect(statusView(premio({ status: "sem_retirada", prazo: null }), 0)).toMatchObject({
      label: "Sem retirada",
      tone: "alert",
    });
  });

  it("estado desconhecido: o texto cru, em cinza", () => {
    expect(statusView(premio({ status: "novo_estado" }), 0)).toMatchObject({
      label: "novo_estado",
      tone: "muted",
    });
  });
});

describe("actionsFor", () => {
  it("prêmio em aberto: +10 min, passar, entregue sem código, cancelar", () => {
    for (const status of ["avisando", "avisado", "prazo_estourou", "aviso_falhou"]) {
      expect(actionsFor(premio({ status }))).toEqual([
        "mais_10_min",
        "passar",
        "entregue_sem_codigo",
        "cancelar",
      ]);
    }
  });

  it("depois do 5º: continuar, sortear, guardar", () => {
    expect(actionsFor(premio({ status: "sem_retirada" }))).toEqual(["continuar", "sortear", "guardar"]);
  });

  it("encerrado ou desconhecido: nenhuma ação", () => {
    for (const status of ["entregue", "passou", "cancelado", "recusado", "x"]) {
      expect(actionsFor(premio({ status }))).toEqual([]);
    }
  });
});

describe("codeReplyView", () => {
  it("entregue: nome, rodada e hora", () => {
    expect(
      codeReplyView({
        resultado: "entregue",
        display_name: "luna_zen",
        round_name: "Rodada 3",
        entregue_em: "2026-10-24T15:12:00-03:00",
      }),
    ).toEqual({ tone: "ok", title: "Entregue", detail: "luna_zen · Rodada 3 · 15:12" });
  });

  it("repetido: já entregue às HH:MM", () => {
    expect(
      codeReplyView({ resultado: "ja_entregue", display_name: "luna_zen", entregue_em: "2026-10-24T15:12:00-03:00" }),
    ).toMatchObject({ tone: "warn", title: "Já entregue às 15:12" });
  });

  it("errado e espera", () => {
    expect(codeReplyView({ resultado: "invalido" })).toMatchObject({ tone: "alert", title: "Código errado" });
    expect(
      codeReplyView({ resultado: "espere", espere_ate: "2026-10-24T15:13:30-03:00" }),
    ).toMatchObject({ tone: "warn", title: "Muitas tentativas", detail: "Tente de novo às 15:13:30" });
  });

  it("resposta fora do contrato → null", () => {
    expect(codeReplyView({ resultado: "talvez" })).toBeNull();
    expect(codeReplyView("entregue")).toBeNull();
  });
});

describe("formatação", () => {
  it("contagem mm:ss arredonda para cima: o último segundo mostra 0:01, nunca 0:00 em verde", () => {
    expect(formatCountdown(605_000)).toBe("10:05");
    expect(formatCountdown(59_400)).toBe("1:00");
    expect(formatCountdown(400)).toBe("0:01");
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-1)).toBe("0:00");
  });

  it("tempo com milésimo para explicar empate", () => {
    expect(formatScoreExact(48.312)).toBe("48,312 s");
    expect(formatScoreExact(null)).toBe("—");
  });

  it("agrupa por rodada na ordem que veio, com a fila em ordem", () => {
    const groups = groupByRound([
      premio({ id: "a", round_id: "r3", posicao: 2 }),
      premio({ id: "b", round_id: "r2", round_name: "Rodada 2", posicao: 1 }),
      premio({ id: "c", round_id: "r3", posicao: 1 }),
    ]);
    expect(groups.map((g) => [g.round_name, g.premios.map((p) => p.id)])).toEqual([
      ["Rodada 3", ["c", "a"]],
      ["Rodada 2", ["b"]],
    ]);
  });
});
