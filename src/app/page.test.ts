import { describe, expect, it } from "vitest";
import { PRODUCT_NAME } from "@/config/product";

describe("configuração inicial", () => {
  it("usa a marca oficial do produto", () => {
    expect(PRODUCT_NAME).toBe("Vapor Entregas");
  });
});
