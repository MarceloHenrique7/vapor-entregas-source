import { describe, expect, it } from "vitest";

import {
  mercadoPagoCardResolutionDiagnostic,
  mercadoPagoDiagnosticStage,
  mercadoPagoSdkErrorDiagnostic,
} from "./mercado-pago-client-diagnostics";

describe("diagnóstico seguro do MercadoPago.js", () => {
  it("classifica erro de payment methods e mantém somente campos seguros", () => {
    const diagnostic = mercadoPagoSdkErrorDiagnostic("payment-methods", {
      code: "internal_server_error",
      status: 500,
      message:
        "Failed to get payment methods for test@example.com card_token_id=secret-token-123",
    });

    expect(diagnostic).toEqual({
      stage: "payment-methods",
      sdkErrorCode: "internal_server_error",
      sdkErrorStatus: 500,
      sdkErrorMessage:
        "Failed to get payment methods for [REDACTED] card_token_id=[REDACTED]",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("secret-token-123");
    expect(JSON.stringify(diagnostic)).not.toContain("test@example.com");
  });

  it("registra somente presença da resolução e nunca os valores", () => {
    const diagnostic = mercadoPagoCardResolutionDiagnostic({
      paymentMethodId: "visa",
      issuerId: "123",
      token: "card-token-secret",
    });

    expect(diagnostic).toEqual({
      paymentMethodResolved: true,
      issuerResolved: true,
      tokenGenerated: true,
    });
    expect(JSON.stringify(diagnostic)).not.toContain("visa");
    expect(JSON.stringify(diagnostic)).not.toContain("card-token-secret");
  });

  it("identifica o estágio pelo erro do SDK", () => {
    expect(
      mercadoPagoDiagnosticStage([
        { message: "MercadoPago.js - Failed to get payment methods." },
      ]),
    ).toBe("payment-methods");
  });
});
