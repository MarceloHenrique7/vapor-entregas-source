import type { OrderProviderAdapter } from "./types";
import { genericWebhookOrderSchema } from "./schemas";

export const genericWebhookAdapter: OrderProviderAdapter = {
  code: "GENERIC_WEBHOOK",
  label: "Webhook parceiro",
  normalize(input) {
    const value = genericWebhookOrderSchema.parse(input);
    const merchantDelivery = value.deliveryMode === "MERCHANT";
    return {
      externalId: value.externalId,
      channel: value.channel,
      externalStatus: value.status,
      externalCreatedAt: value.externalCreatedAt
        ? new Date(value.externalCreatedAt)
        : undefined,
      lastEventAt: value.occurredAt ? new Date(value.occurredAt) : new Date(),
      logisticsMode: value.deliveryMode,
      eligibleForOwnDelivery: merchantDelivery,
      ...(merchantDelivery
        ? {
            destinationAddress: value.destination.address,
            destinationNumber: value.destination.number,
            destinationNeighborhood: value.destination.neighborhood,
            destinationComplement: value.destination.complement,
            destinationReference: value.destination.reference,
            destinationPhone: value.destination.phone,
            destinationCity: value.destination.city,
            destinationState: value.destination.state,
            destinationPostalCode: value.destination.postalCode,
            notes: value.notes,
          }
        : {}),
      metadata: { storeId: value.storeId ?? null },
    };
  },
};

export const ifoodAdapterStatus = {
  code: "IFOOD" as const,
  label: "iFood",
  status: "AWAITING_AUTHORIZATION" as const,
  message:
    "Aguardando credenciais, autorização das lojas e homologação oficial. Nenhum pedido iFood é importado nesta configuração.",
};
