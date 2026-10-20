import { describe, expect, it } from "vitest";
import { pickPrize, prizeView, type PrizeRow } from "@/lib/prize";

// 24/10 15:20 em São Paulo (UTC-3).
const DEADLINE = "2026-10-24T18:20:00Z";
const at = (hhmm: string) => new Date(`2026-10-24T${hhmm}:00-03:00`);

const row = (over: Partial<PrizeRow> = {}): PrizeRow => ({
  round_name: "Rodada 2",
  status: "avisado",
  code: "482913",
  claim_deadline: DEADLINE,
  delivered_at: null,
  ...over,
});

describe("prizeView", () => {
  it("sem prêmio -> nada aparece", () => {
    expect(prizeView(null, at("15:00"))).toEqual({ kind: "none" });
  });

  it("janela aberta: rodada, código e hora limite no horário de São Paulo", () => {
    expect(prizeView(row(), at("15:10"))).toEqual({
      kind: "open",
      round: "Rodada 2",
      code: "482913",
      deadline: "15:20",
      late: false,
    });
  });

  it("passou da hora limite: continua mostrando o código, marcado como atrasado", () => {
    // NEU-167: o código vale até o operador passar o prêmio.
    expect(prizeView(row(), at("15:21"))).toMatchObject({ kind: "open", code: "482913", late: true });
    expect(prizeView(row({ status: "prazo_estourou" }), at("15:10"))).toMatchObject({
      kind: "open",
      late: true,
    });
  });

  it("antes de montar no navegador (sem relógio) não marca atraso", () => {
    expect(prizeView(row(), null)).toMatchObject({ kind: "open", late: false });
  });

  it("aviso ainda saindo ou que falhou: mostra o código sem hora limite", () => {
    // Conta só com celular e WhatsApp desligado: nenhum canal confirma e a janela
    // não começa. O painel é o único lugar garantido (NEU-171, NEU-174).
    for (const status of ["avisando", "aviso_falhou"]) {
      expect(prizeView(row({ status, claim_deadline: null }), at("15:00"))).toEqual({
        kind: "open",
        round: "Rodada 2",
        code: "482913",
        deadline: null,
        late: false,
      });
    }
  });

  it("entregue: hora da retirada e nenhum código", () => {
    expect(
      prizeView(row({ status: "entregue", delivered_at: "2026-10-24T18:31:00Z" }), at("16:00")),
    ).toEqual({ kind: "delivered", round: "Rodada 2", at: "15:31" });
  });

  it("recusado: o prêmio passou, sem código", () => {
    expect(prizeView(row({ status: "recusado" }), at("16:00"))).toEqual({
      kind: "passed",
      round: "Rodada 2",
    });
  });

  it("estados sem nada para a pessoa ver -> nada aparece", () => {
    for (const status of ["aguardando_fechamento", "sem_retirada", "cancelado", "inventado"]) {
      expect(prizeView(row({ status }), at("15:00"))).toEqual({ kind: "none" });
    }
  });

  it("estado de janela aberta sem código não mostra cartão vazio", () => {
    expect(prizeView(row({ code: null }), at("15:00"))).toEqual({ kind: "none" });
  });
});

describe("pickPrize", () => {
  it("lista vazia -> null", () => {
    expect(pickPrize([])).toBeNull();
  });

  it("prefere o prêmio com código valendo a um mais recente já encerrado", () => {
    const aberto = row({ round_name: "Rodada 1" });
    const passou = row({ round_name: "Rodada 3", status: "recusado" });
    expect(pickPrize([passou, aberto])).toBe(aberto);
  });

  it("sem prêmio aberto, fica com o primeiro (o mais recente)", () => {
    const entregue = row({ round_name: "Rodada 3", status: "entregue" });
    const passou = row({ round_name: "Rodada 1", status: "recusado" });
    expect(pickPrize([entregue, passou])).toBe(entregue);
  });
});
