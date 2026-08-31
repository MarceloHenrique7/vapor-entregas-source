import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  publishDeliveryEvent,
  subscribeToDeliveryEvents,
} from "./delivery-events";

describe("canais realtime de entrega", () => {
  it("entrega eventos somente à audiência autorizada", () => {
    const companyA = vi.fn();
    const companyB = vi.fn();
    const motoboy = vi.fn();
    const cleanup = [
      subscribeToDeliveryEvents({
        role: "COMPANY",
        profileId: "company-a",
        send: companyA,
      }),
      subscribeToDeliveryEvents({
        role: "COMPANY",
        profileId: "company-b",
        send: companyB,
      }),
      subscribeToDeliveryEvents({
        role: "MOTOBOY",
        profileId: "motoboy-a",
        send: motoboy,
      }),
    ];

    publishDeliveryEvent({
      type: "corrida_aceita",
      deliveryId: "delivery-a",
      audience: { kind: "company", profileId: "company-a" },
    });
    expect(companyA).toHaveBeenCalledWith({
      type: "corrida_aceita",
      deliveryId: "delivery-a",
    });
    expect(companyB).not.toHaveBeenCalled();
    expect(motoboy).not.toHaveBeenCalled();

    publishDeliveryEvent({
      type: "nova_corrida",
      deliveryId: "delivery-b",
      audience: { kind: "motoboys" },
    });
    expect(motoboy).toHaveBeenCalledWith({
      type: "nova_corrida",
      deliveryId: "delivery-b",
    });
    expect(companyB).not.toHaveBeenCalled();

    cleanup.forEach((unsubscribe) => unsubscribe());
  });
});
