import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { genericWebhookAdapter } from "./providers";
import { parseOrdersCsv } from "./integration-service";
import { verifyWebhookSignature } from "./security";

vi.mock("server-only", () => ({}));

describe("integrações de pedidos", () => {
  it("valida HMAC sobre timestamp e corpo exato e rejeita replay antigo", () => {
    const secret = "segredo-de-teste-com-tamanho-suficiente";
    const body = '{"externalId":"pedido-1"}';
    const now = new Date("2026-10-17T12:00:00.000Z");
    const timestamp = String(now.getTime());
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    expect(
      verifyWebhookSignature({ secret, timestamp, body, signature, now }),
    ).toBe(true);
    expect(
      verifyWebhookSignature({
        secret,
        timestamp: String(now.getTime() - 6 * 60_000),
        body,
        signature,
        now,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body: `${body} `,
        signature,
        now,
      }),
    ).toBe(false);
  });

  it("não torna elegível pedido cuja logística pertence à plataforma externa", () => {
    const order = genericWebhookAdapter.normalize({
      externalId: "ifood-1",
      eventType: "ORDER_CREATED",
      channel: "Parceiro",
      deliveryMode: "PLATFORM",
      destination: {
        address: "Rua privada",
        number: "10",
        neighborhood: "Centro",
        city: "PETROLINA_PE",
        state: "PE",
      },
    });
    expect(order.eligibleForOwnDelivery).toBe(false);
    expect(order.destinationAddress).toBeUndefined();
  });

  it("revisa CSV antes da confirmação e sinaliza linhas inválidas", () => {
    const rows = parseOrdersCsv(
      [
        "external_id,canal,rua,numero,bairro,cidade,estado,cep,telefone,observacao",
        "pedido-1,Cardápio,Rua A,10,Centro,Petrolina,PE,56300000,87999999999,Sem cebola",
        "pedido-2,Cardápio,,20,Centro,Juazeiro,PE,,,",
      ].join("\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      valid: true,
      destinationCity: "PETROLINA_PE",
    });
    expect(rows[1].valid).toBe(false);
    expect(rows[1].errors).toContain("rua é obrigatória");
    expect(rows[1].errors).toContain("estado não corresponde à cidade");
  });
});
