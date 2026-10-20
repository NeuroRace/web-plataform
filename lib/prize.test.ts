import { describe, expect, it } from "vitest";
import {
  hasClaimedPrize,
  parsePrizeRows,
  prizeView,
  visiblePrizes,
  type PrizeRow,
} from "@/lib/prize";

// 24/10 15:20 em São Paulo (UTC-3).
const DEADLINE = "2026-10-24T18:20:00Z";

const row = (over: Partial<PrizeRow> = {}): PrizeRow => ({
  round_name: "Rodada 2",
  status: "avisado",
  code: "482913",
  claim_deadline: DEADLINE,
  delivered_at: null,
  ...over,
});

describe("prizeView", () => {
  it("janela aberta: rodada, código e hora limite no horário de São Paulo", () => {
    expect(prizeView(row())).toEqual({
      kind: "open",
      round: "Rodada 2",
      code: "482913",
      deadline: "15:20",
      late: false,
    });
  });

  it("atraso vem do banco (prazo_estourou), não do relógio do aparelho", () => {
    // NEU-167: o código vale até o operador passar o prêmio.
    expect(prizeView(row({ status: "prazo_estourou" }))).toMatchObject({
      kind: "open",
      code: "482913",
      late: true,
    });
    expect(prizeView(row({ status: "avisado" }))).toMatchObject({ late: false });
  });

  it("aviso ainda saindo ou que falhou: mostra o código sem hora limite", () => {
    // Conta só com celular e WhatsApp desligado: nenhum canal confirma e a janela
    // não começa. O painel é o único lugar garantido (NEU-171, NEU-174).
    for (const status of ["avisando", "aviso_falhou"]) {
      expect(prizeView(row({ status, claim_deadline: null }))).toEqual({
        kind: "open",
        round: "Rodada 2",
        code: "482913",
        deadline: null,
        late: false,
      });
    }
  });

  it("entregue: hora da retirada e nenhum código", () => {
    expect(prizeView(row({ status: "entregue", delivered_at: "2026-10-24T18:31:00Z" }))).toEqual({
      kind: "delivered",
      round: "Rodada 2",
      at: "15:31",
    });
  });

  it("passou ou recusado: o prêmio passou, sem código", () => {
    for (const status of ["passou", "recusado"]) {
      expect(prizeView(row({ status }))).toEqual({ kind: "passed", round: "Rodada 2" });
    }
  });

  it("estados sem nada para a pessoa ver -> nada aparece", () => {
    for (const status of ["aguardando_fechamento", "sem_retirada", "cancelado", "inventado"]) {
      expect(prizeView(row({ status }))).toEqual({ kind: "none" });
    }
  });

  it("estado de janela aberta sem código não mostra cartão vazio", () => {
    expect(prizeView(row({ code: null }))).toEqual({ kind: "none" });
  });
});

describe("visiblePrizes", () => {
  it("sem linhas -> nada", () => {
    expect(visiblePrizes([])).toEqual([]);
  });

  it("dois códigos valendo: mostra os dois, para nenhum prêmio passar sem a pessoa saber", () => {
    const r3 = row({ round_name: "Rodada 3", code: "111111" });
    const r1 = row({ round_name: "Rodada 1", status: "aviso_falhou", code: "222222" });
    expect(visiblePrizes([r3, r1])).toEqual([r3, r1]);
  });

  it("com código valendo, esconde os já encerrados", () => {
    const aberto = row({ round_name: "Rodada 1" });
    const passou = row({ round_name: "Rodada 3", status: "passou" });
    expect(visiblePrizes([passou, aberto])).toEqual([aberto]);
  });

  it("sem código valendo, mostra o mais recente que tem algo a dizer", () => {
    // Linha mais recente sem nada para mostrar não pode esconder a retirada anterior.
    const fechando = row({ round_name: "Rodada 3", status: "aguardando_fechamento", code: null });
    const entregue = row({ round_name: "Rodada 1", status: "entregue" });
    const passou = row({ round_name: "Rodada 0", status: "passou" });
    expect(visiblePrizes([fechando, entregue, passou])).toEqual([entregue]);
  });

  it("nada que mostrar -> nada", () => {
    expect(visiblePrizes([row({ status: "cancelado" })])).toEqual([]);
  });
});

describe("hasClaimedPrize", () => {
  it("prêmio retirado: a conta não ganha de novo no evento, não precisa buscar mais", () => {
    expect(hasClaimedPrize([row({ status: "entregue" })])).toBe(true);
    expect(hasClaimedPrize([row({ status: "passou" })])).toBe(false);
    expect(hasClaimedPrize([])).toBe(false);
  });
});

describe("parsePrizeRows", () => {
  it("lista no formato do contrato -> as mesmas linhas", () => {
    expect(parsePrizeRows([row()])).toEqual([row()]);
  });

  it("formato diferente do combinado (objeto em vez de lista) -> null, sem quebrar o painel", () => {
    expect(parsePrizeRows({ round_name: "Rodada 2", status: "avisado" })).toBeNull();
    expect(parsePrizeRows(null)).toBeNull();
  });

  it("descarta linha fora do formato e fica com as boas", () => {
    expect(parsePrizeRows([row(), { round_name: 2, status: "avisado" }])).toEqual([row()]);
  });
});
