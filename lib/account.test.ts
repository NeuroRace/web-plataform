import { describe, expect, it } from "vitest";
import { contactLine, greetingName, maskPhone } from "@/lib/account";

describe("greetingName", () => {
  it("usa o apelido, mesmo com e-mail", () => {
    expect(greetingName("Breq", "fulano@exemplo.com")).toBe("Breq");
  });

  it("conta só com celular e apelido -> o apelido (NEU-175)", () => {
    expect(greetingName("Breq", null)).toBe("Breq");
  });

  it("sem apelido, o nome do e-mail, como antes", () => {
    expect(greetingName(null, "breq.silva@exemplo.com")).toBe("Breq");
    expect(greetingName("   ", "breq@exemplo.com")).toBe("Breq");
  });

  it("sem apelido e sem e-mail -> Jogador", () => {
    expect(greetingName(null, null)).toBe("Jogador");
    expect(greetingName(null, "")).toBe("Jogador");
  });
});

describe("maskPhone", () => {
  it("mostra DDD, o 9 e os 4 últimos dígitos", () => {
    expect(maskPhone("+5511987654321")).toBe("+55 11 9••••-4321");
  });

  it("aceita o formato do Supabase, sem o +", () => {
    expect(maskPhone("5511987654321")).toBe("+55 11 9••••-4321");
  });

  it("fora do formato brasileiro, só os 4 últimos", () => {
    expect(maskPhone("+14155552671")).toBe("••••2671");
    expect(maskPhone("12")).toBe("");
  });
});

describe("contactLine", () => {
  it("conta só com e-mail -> o e-mail, igual a hoje", () => {
    expect(contactLine("breq@exemplo.com", null)).toBe("breq@exemplo.com");
  });

  it("conta só com celular -> celular mascarado", () => {
    expect(contactLine(null, "5511987654321")).toBe("+55 11 9••••-4321");
    expect(contactLine("", "5511987654321")).toBe("+55 11 9••••-4321");
  });

  it("com os dois, o e-mail", () => {
    expect(contactLine("breq@exemplo.com", "5511987654321")).toBe("breq@exemplo.com");
  });

  it("sem nenhum -> vazio", () => {
    expect(contactLine(null, null)).toBe("");
  });
});
