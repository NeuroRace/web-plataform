import { describe, it, expect, vi } from "vitest";
import { executarAcao, lerAcao } from "@/lib/mensagens";

const BASE = "https://x.supabase.co";

// Token no formato da message-actions: base64url(JSON).assinatura. Aqui so a 1a parte importa.
function token(payload: unknown): string {
  const b64 = btoa(JSON.stringify(payload)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${b64}.assinatura`;
}

function resposta(status: number, corpo: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status }));
}

describe("lerAcao", () => {
  it("le sair e recusar do token", () => {
    expect(lerAcao(token({ a: "sair", m: "x", exp: 1 }))).toBe("sair");
    expect(lerAcao(token({ a: "recusar", m: "x", exp: 1 }))).toBe("recusar");
  });

  it("token ausente, ilegivel ou com acao desconhecida: null", () => {
    expect(lerAcao(null)).toBeNull();
    expect(lerAcao("")).toBeNull();
    expect(lerAcao("lixo")).toBeNull();
    expect(lerAcao("%%%.x")).toBeNull();
    expect(lerAcao(token({ a: "apagar" }))).toBeNull();
  });
});

describe("executarAcao", () => {
  it("faz POST com o token para a message-actions", async () => {
    const f = resposta(200, { ok: true, acao: "sair" });
    await executarAcao("tok", f, BASE);
    expect(f).toHaveBeenCalledWith(`${BASE}/functions/v1/message-actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: "tok" }),
    });
  });

  it("200 sair ou recusado: feito", async () => {
    expect(await executarAcao("t", resposta(200, { ok: true, acao: "sair" }), BASE)).toBe("feito");
    expect(await executarAcao("t", resposta(200, { ok: true, acao: "recusar", resultado: "recusado" }), BASE))
      .toBe("feito");
  });

  it("premio que nao vale mais: ja_resolvido", async () => {
    expect(await executarAcao("t", resposta(200, { ok: true, acao: "recusar", resultado: "ja_resolvido" }), BASE))
      .toBe("ja_resolvido");
  });

  it("403, 404 e mensagem que nao e de premio: link_invalido", async () => {
    expect(await executarAcao("t", resposta(403, { erro: "assinatura" }), BASE)).toBe("link_invalido");
    expect(await executarAcao("t", resposta(404, { erro: "nao_encontrada" }), BASE)).toBe("link_invalido");
    expect(await executarAcao("t", resposta(200, { ok: true, acao: "recusar", resultado: "invalido" }), BASE))
      .toBe("link_invalido");
  });

  it("500, rede fora ou resposta fora do contrato: erro", async () => {
    expect(await executarAcao("t", resposta(500, { erro: "falha_interna" }), BASE)).toBe("erro");
    expect(await executarAcao("t", vi.fn().mockRejectedValue(new TypeError("offline")), BASE)).toBe("erro");
    expect(await executarAcao("t", resposta(200, { coisa: 1 }), BASE)).toBe("erro");
    expect(await executarAcao("t", vi.fn().mockResolvedValue(new Response("nao json", { status: 200 })), BASE))
      .toBe("erro");
  });
});
