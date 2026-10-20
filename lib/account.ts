// NEU-175: com o login sem senha (NEU-161), a conta pode ter só e-mail, só
// celular ou os dois. O topo do painel não pode supor e-mail: quem entra com
// celular via "Olá, Jogador!" e uma linha de contato vazia.

/** "breq.silva@x.com" → "Breq". Vazio → "". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

/** Saudação do painel: apelido, depois o nome do e-mail, e "Jogador" só sem nenhum dos dois. */
export function greetingName(displayName: string | null, email: string | null): string {
  return displayName?.trim() || nameFromEmail(email ?? "") || "Jogador";
}

/**
 * Celular mascarado para a tela: "+55 11 9••••-4321". O Supabase guarda o
 * número sem o "+" ("5511987654321"); aceita os dois. Fora do formato
 * brasileiro, mostra só os 4 últimos dígitos.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const br = digits.match(/^55(\d{2})(9)\d{4}(\d{4})$/);
  if (br) return `+55 ${br[1]} ${br[2]}••••-${br[3]}`;
  return digits.length >= 4 ? `••••${digits.slice(-4)}` : "";
}

/** Linha de contato abaixo da saudação: o e-mail, ou o celular mascarado, o que a conta tiver. */
export function contactLine(email: string | null, phone: string | null): string {
  if (email) return email;
  return phone ? maskPhone(phone) : "";
}
