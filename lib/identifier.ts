// NEU-161: o login passa a aceitar e-mail OU celular no mesmo campo. A regra é a
// mesma do painel do estande: tem "@" vira e-mail, só dígitos vira celular.
//
// O celular sai daqui em E.164 (+55DDD9XXXXXXXX), que é o formato que o Supabase
// exige. Quem digita no estande escreve "11 99999-9999"; quem digita aqui pode
// escrever com ou sem +55, com ou sem máscara — tudo cai no mesmo valor.

export type Identifier =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "invalid"; reason: "empty" | "email" | "phone" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Celular brasileiro: DDD de 2 dígitos (11 a 99) + 9 + 8 dígitos. */
function toE164BR(digits: string): string | null {
  // Aceita o 55 na frente, mas só quando sobra um celular inteiro depois dele:
  // "5511987654321" é São Paulo com país, "11987654321" é o mesmo número sem.
  const local = digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length !== 11) return null;
  const ddd = Number(local.slice(0, 2));
  if (!(ddd >= 11 && ddd <= 99)) return null;
  if (local[2] !== "9") return null;
  return `+55${local}`;
}

export function parseIdentifier(raw: string): Identifier {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { kind: "invalid", reason: "empty" };

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    return EMAIL_RE.test(email) ? { kind: "email", value: email } : { kind: "invalid", reason: "email" };
  }

  const digits = trimmed.replace(/\D/g, "");
  const phone = toE164BR(digits);
  return phone ? { kind: "phone", value: phone } : { kind: "invalid", reason: "phone" };
}

/** Como o identificador aparece na tela do código ("enviamos para ..."). */
export function describeIdentifier(id: Identifier): string {
  if (id.kind === "email") return id.value;
  if (id.kind === "phone") return id.value.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return "";
}

// O e-mail de prod manda 8 dígitos (`mailer_otp_length=8`); o SMS da Twilio, 6.
export const CODE_LENGTH = { email: 8, phone: 6 } as const;
