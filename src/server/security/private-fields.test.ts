import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptPrivateField,
  encryptPrivateField,
  fingerprintPrivateField,
} from "./private-fields";

describe("campos privados", () => {
  it("não persiste o valor em texto e usa IV aleatório", () => {
    const key = randomBytes(32).toString("base64");
    const first = encryptPrivateField("52998224725", key);
    const second = encryptPrivateField("52998224725", key);
    expect(first).toMatch(/^v1:/);
    expect(first).not.toContain("52998224725");
    expect(first).not.toBe(second);
  });
  it("gera impressão estável sem revelar o documento", () => {
    const key = randomBytes(32).toString("base64");
    const first = fingerprintPrivateField("52998224725", key);
    const second = fingerprintPrivateField("52998224725", key);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("52998224725");
  });
  it("descriptografa somente com a chave correta", () => {
    const key = randomBytes(32).toString("base64");
    const encrypted = encryptPrivateField("52998224725", key);
    expect(decryptPrivateField(encrypted, key)).toBe("52998224725");
    expect(() =>
      decryptPrivateField(encrypted, randomBytes(32).toString("base64")),
    ).toThrow();
  });
});
