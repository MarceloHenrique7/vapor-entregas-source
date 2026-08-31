import { describe, expect, it, vi } from "vitest";

import {
  advanceDeliveryStatus,
  cancelDelivery,
  getDeliveryDetails,
  type DeliveryMutationResult,
  type DeliveryRepository,
} from "./delivery-service";
import {
  DeliveryAccessDeniedError,
  DeliveryTransitionConflictError,
} from "./errors";
import type {
  DeliveryRecord,
  DeliveryStatus,
  DeliveryStatusHistoryView,
} from "./types";

const motoboyUserId = "8ecea68d-b6d8-45e1-93c7-bf49dd79999a";
const companyUserId = "6b8c789a-3dd5-4306-9421-06be56bf8ab1";
const deliveryId = "6a3eecbd-7d75-41fd-8782-1e0182fe8cae";
const now = new Date("2026-08-27T18:00:00.000Z");

function delivery(status: DeliveryStatus = "ACCEPTED"): DeliveryRecord {
  return {
    id: deliveryId,
    companyId: "3fbb8fad-c278-4487-a295-b7077f3352bf",
    motoboyId: "a468c810-a5ef-4024-8fdc-c3954e517389",
    companyName: "Mercado do Vale",
    motoboyName: "João Entregador",
    pickupLabel: "Loja principal",
    pickupAddress: "Avenida Guararapes",
    pickupNumber: "120",
    pickupNeighborhood: "Centro",
    pickupCity: "PETROLINA_PE",
    pickupState: "PE",
    pickupLatitude: -9.3891,
    pickupLongitude: -40.5031,
    destinationAddress: "Rua do Destino",
    destinationNumber: "44",
    destinationNeighborhood: "Areia Branca",
    destinationComplement: null,
    destinationReference: null,
    destinationCity: "PETROLINA_PE",
    destinationState: "PE",
    destinationLatitude: -9.37,
    destinationLongitude: -40.49,
    distanceEstimateKm: 2.5,
    distanceMethod: "STRAIGHT_LINE",
    suggestedPrice: 13,
    offeredPrice: 18,
    paymentMethod: "PIX",
    notes: "Pedido pequeno",
    status,
    acceptedAt: now.toISOString(),
    pickedUpAt: null,
    completedAt: null,
    cancelledAt: null,
    expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
    createdAt: now.toISOString(),
    history: [],
  };
}

function repository(
  overrides: Partial<DeliveryRepository> = {},
): DeliveryRepository {
  return {
    getCompanyPickup: vi.fn().mockResolvedValue(null),
    getActiveRule: vi.fn().mockResolvedValue(null),
    createDelivery: vi.fn(),
    listCompanyDeliveries: vi.fn().mockResolvedValue([]),
    getMotoboyContext: vi.fn().mockResolvedValue(null),
    listOpenDeliveries: vi.fn().mockResolvedValue([]),
    acceptDeliveryAtomically: vi
      .fn()
      .mockResolvedValue({ kind: "unavailable" }),
    getCurrentDeliveryForMotoboy: vi.fn().mockResolvedValue(null),
    getDeliveryForActor: vi.fn().mockResolvedValue(delivery()),
    transitionDeliveryAtomically: vi
      .fn()
      .mockResolvedValue({ kind: "conflict" }),
    cancelDeliveryAtomically: vi.fn().mockResolvedValue({ kind: "conflict" }),
    listDeliveryHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function statefulTransitionRepository() {
  let current = delivery();
  const history: DeliveryStatusHistoryView[] = [];
  const repo = repository({
    transitionDeliveryAtomically: vi.fn(
      async (
        userId: string,
        currentDeliveryId: string,
        expectedStatus: DeliveryStatus,
        newStatus: DeliveryStatus,
        note: string | undefined,
        timestamp: Date,
      ): Promise<DeliveryMutationResult> => {
        if (!userId) return { kind: "forbidden" };
        if (currentDeliveryId !== deliveryId) return { kind: "not_found" };
        if (current.status !== expectedStatus) return { kind: "conflict" };
        const item: DeliveryStatusHistoryView = {
          id: `history-${history.length}`,
          previousStatus: current.status,
          newStatus,
          actorRole: "MOTOBOY",
          note: note ?? null,
          createdAt: timestamp.toISOString(),
        };
        history.push(item);
        current = {
          ...current,
          status: newStatus,
          pickedUpAt:
            newStatus === "PICKED_UP"
              ? timestamp.toISOString()
              : current.pickedUpAt,
          completedAt:
            newStatus === "COMPLETED"
              ? timestamp.toISOString()
              : current.completedAt,
          history: [...history],
        };
        return { kind: "updated", delivery: current };
      },
    ),
  });
  return { repo, current: () => current, history };
}

describe("fluxo operacional da entrega", () => {
  it("executa o fluxo completo válido e registra todas as mudanças", async () => {
    const state = statefulTransitionRepository();
    const targets: DeliveryStatus[] = [
      "MOTOBOY_TO_PICKUP",
      "ARRIVED_AT_PICKUP",
      "PICKED_UP",
      "IN_DELIVERY",
      "COMPLETED",
    ];
    for (const status of targets) {
      await advanceDeliveryStatus(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        { status },
        state.repo,
        now,
      );
    }
    expect(state.current().status).toBe("COMPLETED");
    expect(state.current().completedAt).toBe(now.toISOString());
    expect(state.history.map((item) => item.newStatus)).toEqual(targets);
    expect(state.history.every((item) => item.actorRole === "MOTOBOY")).toBe(
      true,
    );
  });

  it("rejeita salto de aceita diretamente para concluída", async () => {
    const state = statefulTransitionRepository();
    await expect(
      advanceDeliveryStatus(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        { status: "COMPLETED" },
        state.repo,
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryTransitionConflictError);
  });

  it("rejeita motoboy não vinculado e empresa alheia", async () => {
    await expect(
      advanceDeliveryStatus(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        { status: "MOTOBOY_TO_PICKUP" },
        repository({
          transitionDeliveryAtomically: vi
            .fn()
            .mockResolvedValue({ kind: "forbidden" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryAccessDeniedError);
    await expect(
      getDeliveryDetails(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        repository({
          getDeliveryForActor: vi.fn().mockResolvedValue("forbidden"),
        }),
      ),
    ).rejects.toBeInstanceOf(DeliveryAccessDeniedError);
  });

  it("trata transição duplicada como conflito", async () => {
    const state = statefulTransitionRepository();
    const command = () =>
      advanceDeliveryStatus(
        { userId: motoboyUserId, role: "MOTOBOY" },
        deliveryId,
        { status: "MOTOBOY_TO_PICKUP" },
        state.repo,
        now,
      );
    await expect(command()).resolves.toMatchObject({
      status: "MOTOBOY_TO_PICKUP",
    });
    await expect(command()).rejects.toBeInstanceOf(
      DeliveryTransitionConflictError,
    );
    expect(state.history).toHaveLength(1);
  });

  it("permite cancelamento antes da coleta e rejeita depois da conclusão", async () => {
    const cancelled = {
      ...delivery(),
      status: "CANCELLED_BY_COMPANY" as const,
      cancelledAt: now.toISOString(),
    };
    await expect(
      cancelDelivery(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        { reason: "Loja fechou mais cedo" },
        repository({
          cancelDeliveryAtomically: vi
            .fn()
            .mockResolvedValue({ kind: "updated", delivery: cancelled }),
        }),
        now,
      ),
    ).resolves.toMatchObject({ status: "CANCELLED_BY_COMPANY" });
    await expect(
      cancelDelivery(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        {},
        repository({
          cancelDeliveryAtomically: vi
            .fn()
            .mockResolvedValue({ kind: "conflict" }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(DeliveryTransitionConflictError);
  });

  it("gera links de navegação sem expor coordenadas brutas", async () => {
    const details = await getDeliveryDetails(
      { userId: motoboyUserId, role: "MOTOBOY" },
      deliveryId,
      repository(),
    );
    expect(details.pickupNavigation?.googleMaps).toContain("google.com/maps");
    expect(details.destinationNavigation?.waze).toContain("waze.com/ul");
    expect(details).not.toHaveProperty("pickupLatitude");
    expect(details).not.toHaveProperty("destinationLongitude");
  });
});
