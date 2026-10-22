import { describe, expect, it } from "vitest";
import { translateSendError, translateVerifyError } from "@/lib/otp-errors";

const FALLBACK = "Não deu para entrar agora. Tente de novo.";

describe("translateVerifyError", () => {
  // O que o Supabase manda de verdade para código errado E para código vencido.
  const real = { message: "Token has expired or is invalid", code: "otp_expired", status: 403 };

  it("a resposta real do Supabase vira uma frase só, sem dizer que venceu", () => {
    const texto = translateVerifyError(real, FALLBACK);
    expect(texto).toBe("Código incorreto ou vencido. Confira os dígitos ou peça um novo.");
    expect(texto).not.toMatch(/venceu/);
  });

  it("formato inválido cai na mesma frase", () => {
    expect(translateVerifyError({ message: "Token has invalid format" }, FALLBACK)).toMatch(/incorreto ou vencido/);
  });

  it("429 vira 'espere um pouco'", () => {
    expect(translateVerifyError({ message: "x", status: 429 }, FALLBACK)).toMatch(/espere um pouco/i);
  });

  it("o resto usa a frase de quem chama", () => {
    expect(translateVerifyError({ message: "boom" }, FALLBACK)).toBe(FALLBACK);
  });
});

describe("translateSendError", () => {
  it("contato de outra conta só quando a conta adiciona um contato", () => {
    const existe = { message: "A user with this phone number has already been registered", code: "phone_exists" };
    expect(translateSendError(existe, "phone")).toBe("Esse celular já está em outra conta.");
    expect(translateSendError({ message: "x", code: "email_exists" }, "email")).toBe("Esse e-mail já está em outra conta.");
  });

  it("número ou e-mail recusado pelo Supabase tem mensagem própria", () => {
    expect(translateSendError({ message: "Invalid phone number format" }, "phone")).toMatch(/celular inválido/i);
    expect(translateSendError({ message: "Unable to validate email address: invalid format" })).toBe("E-mail inválido.");
  });

  it("429 e falha genérica", () => {
    expect(translateSendError({ message: "rate limit exceeded", status: 429 })).toMatch(/espere um pouco/i);
    expect(translateSendError({ message: "smtp down" })).toMatch(/não deu para enviar/i);
  });
});
