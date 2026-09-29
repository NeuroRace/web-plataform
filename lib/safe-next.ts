/**
 * Destino depois do login/confirmação: só caminho interno.
 * Bloqueia redirect para fora (https://…, //…, /\…, @host) e cai no /dashboard.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/dashboard";
  }
  return raw;
}
