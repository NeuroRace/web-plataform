// Links dos e-mails da premiação ("Parar de receber" e "Não vou poder"), NEU-112.
// Contrato: docs/frontend-integration.md §8.2 do cloud-backend. O token é base64url(JSON).assinatura;
// aqui só lemos a ação para escolher o texto. Quem valida a assinatura é a message-actions.

export type AcaoLink = "sair" | "recusar";
export type ResultadoAcao = "feito" | "ja_resolvido" | "link_invalido" | "erro";

export function lerAcao(token: string | null): AcaoLink | null {
  if (!token) return null;
  try {
    const parte = token.split(".")[0].replaceAll("-", "+").replaceAll("_", "/");
    const { a } = JSON.parse(atob(parte));
    return a === "sair" || a === "recusar" ? a : null;
  } catch {
    return null;
  }
}

export async function executarAcao(
  token: string,
  fetchFn: typeof fetch = fetch,
  base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
): Promise<ResultadoAcao> {
  if (!base) {
    console.warn("[mensagens] NEXT_PUBLIC_SUPABASE_URL ausente");
    return "erro";
  }
  try {
    const r = await fetchFn(`${base}/functions/v1/message-actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: token }),
    });
    const corpo = await r.json().catch(() => null);
    // Só é "link inválido" quando a própria função diz. Um 404/403 de outra origem (função não
    // publicada, gateway) é erro de deploy e não pode virar culpa de quem clicou.
    if (r.status === 403 && corpo?.erro === "assinatura") return "link_invalido";
    if (r.status === 404 && corpo?.erro === "nao_encontrada") return "link_invalido";
    if (!r.ok) {
      console.warn(`[mensagens] message-actions respondeu ${r.status} fora do contrato`);
      return "erro";
    }
    if (corpo?.ok !== true) return "erro";
    if (corpo.acao === "sair") return "feito";
    if (corpo.acao === "recusar") {
      if (corpo.resultado === "recusado") return "feito";
      if (corpo.resultado === "ja_resolvido") return "ja_resolvido";
      if (corpo.resultado === "invalido") return "link_invalido";
    }
    console.warn("[mensagens] resposta fora do contrato da message-actions");
    return "erro";
  } catch {
    return "erro";
  }
}
