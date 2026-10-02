import { describe, expect, it } from "vitest";

import { formatBrazilPhoneInput, normalizeBrazilPhone } from "./phone";

describe("telefone brasileiro", () => {
  it.each([
    "87999999999",
    "+5587999999999",
    "55 87 99999-9999",
    "(87) 99999-9999",
  ])("normaliza representações equivalentes: %s", (value) => {
    expect(normalizeBrazilPhone(value)).toBe("+5587999999999");
  });

  it.each(["", "123", "+1 212 555 0100", "0087999999999"])(
    "rejeita telefone inválido: %s",
    (value) => expect(normalizeBrazilPhone(value)).toBeNull(),
  );

  it("formata sem impedir edição parcial", () => {
    expect(formatBrazilPhoneInput("87999999999")).toBe("(87) 99999-9999");
    expect(formatBrazilPhoneInput("87")).toBe("(87");
  });
});
