import { describe, expect, it } from "vitest";
import { flat, makeRace } from "@/lib/coach/test-utils";
import { computeUnlocks, formatUnlockDate } from "./unlocks";

const ACCOUNT = "2026-09-27T15:00:00.000Z";

// r1: foco 40 (Em Aquecimento), 1ª corrida. r2: foco 70 (Hiperfocado), recorde de foco.
// r3: foco 40 de novo, calma 60, às 23:30 de 29/09 em São Paulo (02:30 de 30/09 em UTC).
const r1 = makeRace(flat(40, 30), { id: "r1", startedAt: "2026-09-28T13:00:00.000Z" });
const r2 = makeRace(flat(70, 30), { id: "r2", startedAt: "2026-09-29T20:30:00.000Z" });
const r3 = makeRace(flat(40, 30), { id: "r3", startedAt: "2026-09-30T02:30:00.000Z", meditation: 60 });

function byId(list: ReturnType<typeof computeUnlocks>) {
  return new Map(list.map((u) => [u.id, u]));
}

describe("desbloqueios da coleção (NEU-134)", () => {
  it("test_AccountDefaults_conta_sem_corrida_tem_so_a_moldura_e_a_figurinha_basicas", () => {
    const unlocked = computeUnlocks([], ACCOUNT);
    expect(unlocked.map((u) => u.id).sort()).toEqual(["neurorace", "piloto-neurorace"]);
    expect(unlocked.every((u) => u.at === ACCOUNT && u.metric === null)).toBe(true);
  });

  it("test_UnlockUnion_desbloqueia_o_que_o_NeuroCoach_deu_em_qualquer_corrida", () => {
    const got = byId(computeUnlocks([r3, r1, r2], ACCOUNT));
    expect([...got.keys()].sort()).toEqual(
      [
        "neurorace",
        "piloto-neurorace",
        "em-aquecimento",
        "hiperfocado",
        "primeira-corrida",
        "mente-de-aco",
        "fadiga-zero",
        "largada-relampago",
        "modo-flow",
        "recorde-pessoal",
        "calma-total",
      ].sort(),
    );
  });

  it("test_UnlockPermanent_vale_a_primeira_corrida_que_desbloqueou_e_corrida_pior_depois_nao_tira", () => {
    const got = byId(computeUnlocks([r1, r2, r3], ACCOUNT));
    expect(got.get("em-aquecimento")?.at).toBe(r1.startedAt);
    expect(got.get("hiperfocado")?.at).toBe(r2.startedAt);
    expect(got.get("calma-total")?.at).toBe(r3.startedAt);
  });

  it("test_UnlockMetric_cada_item_mostra_a_metrica_que_ele_premia", () => {
    const got = byId(computeUnlocks([r1, r2, r3], ACCOUNT));
    expect(got.get("em-aquecimento")?.metric).toBe("Foco médio de 40");
    expect(got.get("hiperfocado")?.metric).toBe("Foco médio de 70");
    expect(got.get("largada-relampago")?.metric).toBe("Foco de 70 no começo");
    expect(got.get("modo-flow")?.metric).toBe("100% da corrida na zona de foco");
    expect(got.get("recorde-pessoal")?.metric).toBe("Foco médio de 70");
    expect(got.get("calma-total")?.metric).toBe("Calma média de 60");
    expect(got.get("fadiga-zero")?.metric).toBe("Começou com 40 e terminou com 40");
    expect(got.get("primeira-corrida")?.metric).toBeNull();
  });

  it("test_UnlockDate_data_no_fuso_de_Sao_Paulo", () => {
    expect(formatUnlockDate("2026-09-30T02:30:00.000Z")).toBe("29/09");
    expect(formatUnlockDate("2026-09-28T13:00:00.000Z")).toBe("28/09");
  });

  it("test_UnlockFreshAccount_sem_data_da_conta_os_itens_basicos_continuam_desbloqueados", () => {
    const unlocked = computeUnlocks([], null);
    expect(unlocked.map((u) => u.id).sort()).toEqual(["neurorace", "piloto-neurorace"]);
    expect(unlocked.every((u) => u.at === null)).toBe(true);
  });
});
