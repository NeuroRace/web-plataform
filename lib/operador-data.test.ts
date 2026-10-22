import { describe, expect, it, vi } from "vitest";
import { executarAcao, loadPainel, mudarConfig, validarCodigo } from "./operador-data";

type Reply = { data: unknown; error: { code?: string; message?: string } | null };

function fakeClient(reply: Reply) {
  const rpc = vi.fn(async () => reply);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { rpc } as any, rpc };
}

const config = {
  premiacao_ligada: true,
  pausa_geral: false,
  passar_sozinho: false,
  carencia_min: 5,
  janela_min: 15,
  lembrete_min: 10,
  limite_fila: 5,
  ligada_em: null,
  evento_atual: "NEXT 2026",
};
const painel = { agora: "2026-10-24T15:10:00-03:00", config, premios: [], registro: [] };

describe("operador-data", () => {
  it("conta que não é operadora (42501) → sem_acesso, em toda função", async () => {
    const denied: Reply = { data: null, error: { code: "42501", message: "permission denied" } };
    for (const call of [
      (c: unknown) => loadPainel(c as never),
      (c: unknown) => validarCodigo(c as never, "123456"),
      (c: unknown) => executarAcao(c as never, "p1", "passar"),
      (c: unknown) => mudarConfig(c as never, { pausa_geral: true }),
    ]) {
      const { client } = fakeClient(denied);
      expect(await call(client)).toEqual({ ok: false, erro: "sem_acesso" });
    }
  });

  it("função ainda não publicada (PGRST202) → fora_do_ar", async () => {
    const { client } = fakeClient({ data: null, error: { code: "PGRST202" } });
    expect(await loadPainel(client)).toEqual({ ok: false, erro: "fora_do_ar" });
  });

  it("outro erro ou formato fora do contrato → erro", async () => {
    const { client } = fakeClient({ data: null, error: { code: "", message: "HTTP 500" } });
    expect(await loadPainel(client)).toEqual({ ok: false, erro: "erro" });
    const { client: c2 } = fakeClient({ data: { agora: 1 }, error: null });
    expect(await loadPainel(c2)).toEqual({ ok: false, erro: "erro" });
  });

  it("painel no formato: devolve o painel conferido", async () => {
    const { client, rpc } = fakeClient({ data: painel, error: null });
    const res = await loadPainel(client);
    expect(res.ok && res.data.config.evento_atual).toBe("NEXT 2026");
    expect(rpc).toHaveBeenCalledWith("op_painel");
  });

  it("código: tira espaços e manda só os dígitos", async () => {
    const { client, rpc } = fakeClient({ data: { resultado: "invalido" }, error: null });
    const res = await validarCodigo(client, " 12 34-56 ");
    expect(rpc).toHaveBeenCalledWith("op_validar_codigo", { p_codigo: "123456" });
    expect(res).toMatchObject({ ok: true, data: { title: "Código errado" } });
  });

  it("ação: repassa motivo e devolve a frase de erro do banco", async () => {
    const { client, rpc } = fakeClient({ data: { ok: false, erro: "Falta o motivo" }, error: null });
    const res = await executarAcao(client, "p1", "cancelar", "  acabou o brinde ");
    expect(rpc).toHaveBeenCalledWith("op_acao", { p_premio: "p1", p_acao: "cancelar", p_motivo: "acabou o brinde" });
    expect(res).toEqual({ ok: true, data: { feito: false, mensagem: "Falta o motivo" } });
  });

  it("ação sem motivo manda null; sucesso volta feito", async () => {
    const { client, rpc } = fakeClient({ data: { ok: true }, error: null });
    expect(await executarAcao(client, "p1", "passar")).toEqual({ ok: true, data: { feito: true, mensagem: null } });
    expect(rpc).toHaveBeenCalledWith("op_acao", { p_premio: "p1", p_acao: "passar", p_motivo: null });
  });

  it("config: manda só a mudança e devolve a config gravada", async () => {
    const { client, rpc } = fakeClient({ data: { ...config, pausa_geral: true }, error: null });
    const res = await mudarConfig(client, { pausa_geral: true });
    expect(rpc).toHaveBeenCalledWith("op_config", { p_mudancas: { pausa_geral: true } });
    expect(res.ok && res.data.pausa_geral).toBe(true);
  });
});
