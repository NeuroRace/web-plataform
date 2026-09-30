const FALLBACK = "/dashboard";
// Origem fictícia só para interpretar o caminho; nunca sai daqui.
const BASE = "https://neurorace.invalid";

/**
 * Destino depois do login/confirmação: só caminho interno.
 * Interpreta como o navegador (`new URL`) em vez de comparar texto: tab/CR/LF somem
 * ("/\t/x.com" vira "//x.com") e "\" vale "/". Devolve o caminho já normalizado.
 * Qualquer coisa fora do site cai no /dashboard (NEU-131).
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return FALLBACK;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== BASE) return FALLBACK;

  // "/..//x.com" normaliza para o caminho "//x.com", que o navegador lê como outro host.
  const path = url.pathname + url.search + url.hash;
  return path.startsWith("//") ? FALLBACK : path;
}
