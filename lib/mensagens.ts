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
  try {
    const r = await fetchFn(`${base}/functions/v1/message-actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: token }),
    });
    if (r.status === 403 || r.status === 404) return "link_invalido";
    if (!r.ok) return "erro";
    const corpo = await r.json();
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
