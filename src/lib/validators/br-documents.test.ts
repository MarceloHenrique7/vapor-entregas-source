import { describe, expect, it } from "vitest";
import {
  getBrazilianDocumentType,
  isValidCnpj,
  isValidCpf,
} from "./br-documents";

describe("documentos brasileiros", () => {
  it("valida CPF matematicamente", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
  it("valida CNPJ matematicamente", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });
  it("identifica o tipo sem confiar no cliente", () => {
    expect(getBrazilianDocumentType("52998224725")).toBe("CPF");
    expect(getBrazilianDocumentType("11222333000181")).toBe("CNPJ");
    expect(getBrazilianDocumentType("123")).toBeNull();
  });
});
