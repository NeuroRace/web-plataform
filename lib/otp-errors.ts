// Mensagens de erro do envio e da conferência de código (login e "Seus contatos").
//
// O Supabase (GoTrue) devolve a MESMA resposta, "Token has expired or is invalid"
// (`otp_expired`), para código errado e para código vencido. Separar os dois
// fazia todo dígito errado virar "venceu, peça um novo": a pessoa pedia outro
// SMS, gastava saldo da Twilio e esbarrava no limite de reenvio (review do #32).

export type AuthErrorLike = { message: string; status?: number; code?: string };

export type ContactKind = "email" | "phone";

function isRateLimit(err: AuthErrorLike): boolean {
  const m = err.message.toLowerCase();
  return err.status === 429 || m.includes("rate limit") || m.includes("too many");
}

/** `kind` só quando a conta adiciona um contato: aí "já existe" é um caso possível. */
export function translateSendError(err: AuthErrorLike, kind?: ContactKind): string {
  const m = err.message.toLowerCase();
  if (kind === "phone" && (err.code === "phone_exists" || m.includes("already")))
    return "Esse celular já está em outra conta.";
  if (kind === "email" && (err.code === "email_exists" || m.includes("already")))
    return "Esse e-mail já está em outra conta.";
  if (isRateLimit(err)) return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (m.includes("invalid") && m.includes("phone")) return "Celular inválido. Use DDD + número.";
  if (m.includes("invalid") && m.includes("email")) return "E-mail inválido.";
  return "Não deu para enviar o código agora. Tente de novo.";
}

export function translateVerifyError(err: AuthErrorLike, fallback: string): string {
  const m = err.message.toLowerCase();
  if (isRateLimit(err)) return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (err.code === "otp_expired" || m.includes("expired") || m.includes("invalid") || m.includes("token"))
    return "Código incorreto ou vencido. Confira os dígitos ou peça um novo.";
  return fallback;
}
