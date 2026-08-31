import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { InvalidWebhookSignatureError } from "./errors";
import {
  buildWebhookManifest,
  validateMercadoPagoSignature,
} from "./webhook-signature";

describe("assinatura do webhook Mercado Pago", () => {
  it("valida o manifesto HMAC documentado", () => {
    const secret = "segredo-de-teste-comprido";
    const timestamp = "1704908010";
    const digest = createHmac("sha256", secret)
      .update(buildWebhookManifest("ABC123", "request-1", timestamp))
      .digest("hex");
    expect(() =>
      validateMercadoPagoSignature({
        xSignature: `ts=${timestamp},v1=${digest}`,
        xRequestId: "request-1",
        dataId: "ABC123",
        secret,
      }),
    ).not.toThrow();
  });

  it("rejeita assinatura inválida ou incompleta", () => {
    expect(() =>
      validateMercadoPagoSignature({
        xSignature:
          "ts=1,v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        xRequestId: "request-1",
        dataId: "1",
        secret: "segredo-de-teste-comprido",
      }),
    ).toThrow(InvalidWebhookSignatureError);
    expect(() =>
      validateMercadoPagoSignature({
        xSignature: null,
        xRequestId: null,
        dataId: null,
        secret: undefined,
      }),
    ).toThrow(InvalidWebhookSignatureError);
  });
});
