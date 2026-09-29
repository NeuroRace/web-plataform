/**
 * Navegação completa (recarrega a página), fora do roteador do Next.
 * Em módulo próprio para os testes conseguirem trocar por um mock (o jsdom não deixa
 * espionar `window.location.assign`).
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
