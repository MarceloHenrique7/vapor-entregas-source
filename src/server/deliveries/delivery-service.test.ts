import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";

import {
  acceptDelivery,
  createDelivery,
  listMotoboyOpportunities,
  type DeliveryRepository,
} from "./delivery-service";
import {
  DefaultPickupRequiredError,
  DeliveryExtrasAcknowledgementRequiredError,
  DeliveryUnavailableError,
  MotoboyPresenceRequiredError,
} from "./errors";
import type {
  CompanyPickupContext,
  DeliveryRecord,
  MotoboyDeliveryContext,
} from "./types";

const companyUserId = "6b8c789a-3dd5-4306-9421-06be56bf8ab1";
const motoboyUserId = "8ecea68d-b6d8-45e1-93c7-bf49dd79999a";
const secondMotoboyUserId = "861c63bd-15df-4163-a275-891e311fae98";
const now = new Date("2026-08-27T16:00:00.000Z");

const pickup: CompanyPickupContext = {
  companyId: "3fbb8fad-c278-4487-a295-b7077f3352bf",
  companyName: "Mercado do Vale",
  locationId: "35009983-4c2f-4e54-8d48-f597ff685732",
  label: "Loja principal",
  address: "Avenida Guararapes",
  number: "120",
  neighborhood: "Centro",
  city: "PETROLINA_PE",
  state: "PE",
  latitude: -9.3891,
  longitude: -40.5031,
};

const input = {
  destinationAddress: "Rua do Destino",
  destinationNumber: "44",
  destinationNeighborhood: "Areia Branca",
  destinationCity: "PETROLINA_PE" as const,
  destinationState: "PE" as const,
  destinationLatitude: -9.37,
  destinationLongitude: -40.49,
  offeredPrice: 18,
  paymentMethod: "PIX" as const,
  notes: "Pedido pequeno",
};

const delivery: DeliveryRecord = {
  id: "6a3eecbd-7d75-41fd-8782-1e0182fe8cae",
  companyId: pickup.companyId,
  motoboyId: null,
  motoboyName: null,
  companyName: pickup.companyName,
  pickupLabel: pickup.label,
  pickupAddress: pickup.address,
  pickupNumber: pickup.number,
  pickupNeighborhood: pickup.neighborhood,
  pickupCity: pickup.city,
  pickupState: pickup.state,
  pickupLatitude: pickup.latitude,
  pickupLongitude: pickup.longitude,
  destinationLatitude: input.destinationLatitude,
  destinationLongitude: input.destinationLongitude,
  destinationAddress: input.destinationAddress,
  destinationNumber: input.destinationNumber,
  destinationNeighborhood: input.destinationNeighborhood,
  destinationComplement: null,
  destinationReference: null,
  destinationCity: input.destinationCity,
  destinationState: input.destinationState,
  distanceEstimateKm: 2.5,
  distanceMethod: "STRAIGHT_LINE",
  suggestedPrice: 13,
  offeredPrice: input.offeredPrice,
  paymentMethod: input.paymentMethod,
  notes: input.notes,
  status: "SEARCHING_MOTOBOY",
  acceptedAt: null,
  pickedUpAt: null,
  completedAt: null,
  cancelledAt: null,
  expiresAt: new Date(now.getTime() + 60 * 60_000).toISOString(),
  createdAt: now.toISOString(),
};

function repository(
  overrides: Partial<DeliveryRepository> = {},
): DeliveryRepository {
  const motoboy: MotoboyDeliveryContext = {
    id: "a468c810-a5ef-4024-8fdc-c3954e517389",
    city: "PETROLINA_PE",
    isOnline: true,
    lastLocationAt: now,
    lastLatitude: -9.389,
    lastLongitude: -40.503,
  };
  return {
    getCompanyPickup: vi.fn().mockResolvedValue(pickup),
    getActiveRule: vi.fn().mockResolvedValue({
      id: "14000000-0000-4000-8000-000000000001",
      city: "PETROLINA_PE",
      basePrice: 8,
      pricePerKm: 2,
      minimumPrice: 12,
      enabled: true,
      activeFrom: now,
      activeTo: null,
      createdAt: now,
    }),
    createDelivery: vi.fn().mockResolvedValue(delivery),
    listCompanyDeliveries: vi.fn().mockResolvedValue([delivery]),
    getMotoboyContext: vi.fn().mockResolvedValue(motoboy),
    listOpenDeliveries: vi.fn().mockResolvedValue([delivery]),
    acceptDeliveryAtomically: vi.fn().mockResolvedValue({
      kind: "accepted",
      delivery: { ...delivery, status: "ACCEPTED" },
    }),
    getCurrentDeliveryForMotoboy: vi.fn().mockResolvedValue(null),
    getDeliveryForActor: vi.fn().mockResolvedValue(delivery),
    transitionDeliveryAtomically: vi.fn().mockResolvedValue({
      kind: "updated",
      delivery,
    }),
    cancelDeliveryAtomically: vi.fn().mockResolvedValue({
      kind: "updated",
      delivery,
    }),
    listDeliveryHistory: vi.fn().mockResolvedValue([delivery]),
    ...overrides,
  };
}

describe("entregas e oportunidades", () => {
  it("empresa cria uma oportunidade usando a coleta do servidor", async () => {
    const repo = repository();
    await expect(
      createDelivery(
        { userId: companyUserId, role: "COMPANY" },
        { ...input, companyId: "forjado", pickupLatitude: 0 },
        repo,
        now,
        60,
      ),
    ).resolves.toMatchObject({
      id: delivery.id,
      status: "SEARCHING_MOTOBOY",
      companyName: delivery.companyName,
    });
    expect(repo.createDelivery).toHaveBeenCalledWith(
      companyUserId,
      pickup,
      input,
      expect.objectContaining({
        distanceMethod: "STRAIGHT_LINE",
        suggestedPrice: expect.any(Number),
      }),
      new Date(now.getTime() + 60 * 60_000),
    );
  });

  it("exige ponto padrão confirmado para publicar", async () => {
    await expect(
      createDelivery(
        { userId: companyUserId, role: "COMPANY" },
        input,
        repository({ getCompanyPickup: vi.fn().mockResolvedValue(null) }),
        now,
        60,
      ),
    ).rejects.toBeInstanceOf(DefaultPickupRequiredError);
  });

  it("rejeita coordenadas e valores inválidos", async () => {
    await expect(
      createDelivery(
        { userId: companyUserId, role: "COMPANY" },
        { ...input, destinationLatitude: 91, offeredPrice: 0 },
        repository(),
        now,
        60,
      ),
    ).rejects.toThrow();
  });

  it("valida adicionais conhecidos antes da publicação", async () => {
    const repo = repository();
    await createDelivery(
      { userId: companyUserId, role: "COMPANY" },
      {
        ...input,
        extras: [
          {
            type: "SPECIAL_WEIGHT_VOLUME",
            description: "Caixa de volume especial",
            amount: 8,
          },
        ],
      },
      repo,
      now,
      60,
    );
    expect(repo.createDelivery).toHaveBeenCalledWith(
      companyUserId,
      pickup,
      expect.objectContaining({
        extras: [
          expect.objectContaining({ type: "SPECIAL_WEIGHT_VOLUME", amount: 8 }),
        ],
      }),
      expect.objectContaining({ suggestedPrice: expect.any(Number) }),
      expect.any(Date),
    );
  });

  it("mostra oportunidades próximas apenas ao motoboy online", async () => {
    const result = await listMotoboyOpportunities(
      { userId: motoboyUserId, role: "MOTOBOY" },
      repository(),
      now,
      10,
      20,
    );
    expect(result).toHaveLength(1);
    expect(result[0].distanceToPickupKm).toBeLessThan(1);
    expect(result[0]).not.toHaveProperty("pickupLatitude");
  });

  it("não entrega oportunidades ao motoboy offline", async () => {
    await expect(
      listMotoboyOpportunities(
        { userId: motoboyUserId, role: "MOTOBOY" },
        repository({
          getMotoboyContext: vi.fn().mockResolvedValue({
            id: "motoboy",
            city: "PETROLINA_PE",
            isOnline: false,
            lastLocationAt: null,
            lastLatitude: null,
            lastLongitude: null,
          }),
        }),
        now,
        10,
        20,
      ),
    ).rejects.toBeInstanceOf(MotoboyPresenceRequiredError);
  });

  it("rejeita empresa e usuário anônimo no aceite", async () => {
    await expect(
      acceptDelivery(
        { userId: companyUserId, role: "COMPANY" },
        delivery.id,
        repository(),
        now,
        10,
        20,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      acceptDelivery(null, delivery.id, repository(), now, 10, 20),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("exige confirmação explícita quando existem adicionais", async () => {
    const repo = repository({
      acceptDeliveryAtomically: vi
        .fn()
        .mockResolvedValue({ kind: "extras_acknowledgement_required" }),
    });
    await expect(
      acceptDelivery(
        { userId: motoboyUserId, role: "MOTOBOY" },
        delivery.id,
        repo,
        now,
        10,
        20,
        { extrasAcknowledged: false },
      ),
    ).rejects.toBeInstanceOf(DeliveryExtrasAcknowledgementRequiredError);
    expect(repo.acceptDeliveryAtomically).toHaveBeenCalledWith(
      motoboyUserId,
      delivery.id,
      now,
      expect.any(Date),
      20,
      false,
    );
  });

  it("garante que somente um de dois aceites simultâneos seja confirmado", async () => {
    let claimed = false;
    const repo = repository({
      acceptDeliveryAtomically: vi.fn(async () => {
        if (claimed) return { kind: "unavailable" } as const;
        claimed = true;
        await Promise.resolve();
        return {
          kind: "accepted",
          delivery: { ...delivery, status: "ACCEPTED" },
        } as const;
      }),
    });
    const results = await Promise.allSettled([
      acceptDelivery(
        { userId: motoboyUserId, role: "MOTOBOY" },
        delivery.id,
        repo,
        now,
        10,
        20,
      ),
      acceptDelivery(
        { userId: secondMotoboyUserId, role: "MOTOBOY" },
        delivery.id,
        repo,
        now,
        10,
        20,
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: expect.any(DeliveryUnavailableError),
    });
  });
});
