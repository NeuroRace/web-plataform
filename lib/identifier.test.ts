import { describe, it, expect } from "vitest";
import { parseIdentifier, describeIdentifier, CODE_LENGTH } from "@/lib/identifier";

describe("parseIdentifier: e-mail", () => {
  it("reconhece pelo @ e normaliza em minúsculas", () => {
    expect(parseIdentifier("  Breq@Exemplo.COM ")).toEqual({ kind: "email", value: "breq@exemplo.com" });
  });

  it("com @ mas formato quebrado é e-mail inválido, não celular", () => {
    // Importa a razão: a mensagem na tela é diferente para e-mail e para celular.
    expect(parseIdentifier("breq@")).toEqual({ kind: "invalid", reason: "email" });
    expect(parseIdentifier("@exemplo.com")).toEqual({ kind: "invalid", reason: "email" });
  });
});

describe("parseIdentifier: celular", () => {
  it("aceita com e sem máscara, com e sem +55", () => {
    const esperado = { kind: "phone", value: "+5511987654321" };
    expect(parseIdentifier("11987654321")).toEqual(esperado);
    expect(parseIdentifier("(11) 98765-4321")).toEqual(esperado);
    expect(parseIdentifier("+55 11 98765-4321")).toEqual(esperado);
    expect(parseIdentifier("5511987654321")).toEqual(esperado);
  });

  it("recusa o que não é celular brasileiro com DDD", () => {
    expect(parseIdentifier("987654321").kind).toBe("invalid"); // sem DDD
    expect(parseIdentifier("1133334444").kind).toBe("invalid"); // fixo, sem o 9
    expect(parseIdentifier("0911987654321").kind).toBe("invalid"); // DDD 09 não existe
    expect(parseIdentifier("119876543210").kind).toBe("invalid"); // um dígito a mais
  });

  it("campo vazio tem razão própria", () => {
    expect(parseIdentifier("   ")).toEqual({ kind: "invalid", reason: "empty" });
  });
});

describe("describeIdentifier", () => {
  it("mostra o e-mail como está e o celular formatado", () => {
    expect(describeIdentifier({ kind: "email", value: "breq@exemplo.com" })).toBe("breq@exemplo.com");
    expect(describeIdentifier({ kind: "phone", value: "+5511987654321" })).toBe("(11) 98765-4321");
  });
});

describe("CODE_LENGTH", () => {
  // Os dois tamanhos vêm da configuração: o e-mail de prod usa mailer_otp_length=8
  // e o SMS da Twilio manda 6. A tela precisa aceitar os dois.
  it("8 para e-mail e 6 para SMS", () => {
    expect([CODE_LENGTH.email, CODE_LENGTH.phone]).toEqual([8, 6]);
  });
});
