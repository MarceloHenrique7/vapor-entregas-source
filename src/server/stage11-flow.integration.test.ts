import "dotenv/config";

import { randomBytes, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  acceptDelivery,
  advanceDeliveryStatus,
  cancelDelivery,
  createDelivery,
  getDeliveryDetails,
  listActorDeliveryHistory,
  listCompanyDeliveries,
  listMotoboyOpportunities,
} from "@/server/deliveries/delivery-service";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import {
  DeliveryAccessDeniedError,
  DeliveryTransitionConflictError,
  DeliveryUnavailableError,
} from "@/server/deliveries/errors";
import { getPrisma } from "@/server/db/prisma";
import { authenticateCredentials } from "@/server/auth/authenticate";
import { prismaAuthRepository } from "@/server/auth/prisma-auth-repository";
import { createOrReplaceDefaultCompanyLocation } from "@/server/locations/location-service";
import { prismaLocationRepository } from "@/server/locations/prisma-location-repository";
import { setMotoboyOnline } from "@/server/presence/presence-service";
import { prismaPresenceRepository } from "@/server/presence/prisma-presence-repository";
import { prismaRegistrationRepository } from "@/server/registration/prisma-registration-repository";
import {
  registerCompany,
  registerMotoboy,
} from "@/server/registration/register";
import {
  listNotifications,
  markNotificationRead,
  notifyDeliveryEvent,
  notifyNewOpportunity,
} from "@/server/notifications/notification-service";
import {
  addFavorite,
  createRating,
  createReport,
  removeFavorite,
} from "@/server/reputation/reputation-service";
import {
  DuplicateRatingError,
  DeliveryNotEligibleError,
} from "@/server/reputation/errors";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import {
  getCompanyHistoryDetail,
  getCompanyMotoboyRelationship,
  getCompanyRepeatDraft,
  listCompanyHistory,
  listCompanyMotoboys,
} from "@/server/company-history/company-history-service";
import { prismaCompanyHistoryRepository } from "@/server/company-history/prisma-company-history-repository";
import {
  addDeliveryExtra,
  respondToDeliveryExtra,
} from "@/server/delivery-extras/delivery-extra-service";
import { prismaDeliveryExtraRepository } from "@/server/delivery-extras/prisma-delivery-extra-repository";
import {
  DeliveryExtraAccessDeniedError,
  DeliveryExtraConflictError,
} from "@/server/delivery-extras/errors";
import { assertOperationalSubscription } from "@/server/subscriptions/subscription-service";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { SubscriptionRequiredError } from "@/server/subscriptions/errors";

const enabled = process.env.RUN_DB_INTEGRATION === "1";
const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "");
const digitSeed = [...suffix]
  .map((character) => String(Number.parseInt(character, 16) % 10))
  .join("");
function validCpf(offset: number) {
  const initial = [...digitSeed.slice(offset, offset + 9)].map(Number);
  if (new Set(initial).size === 1) initial[8] = (initial[8] + 1) % 10;
  for (let length = 9; length < 11; length += 1) {
    const factor = length + 1;
    const sum = initial.reduce(
      (total, digit, index) => total + digit * (factor - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    initial.push(remainder === 10 ? 0 : remainder);
  }
  return initial.join("");
}
const companyActor = { userId: "", role: "COMPANY" as const };
const motoboyActors = [
  { userId: "", role: "MOTOBOY" as const },
  { userId: "", role: "MOTOBOY" as const },
];
const createdUserIds: string[] = [];
const createdDeliveryIds: string[] = [];

describe.skipIf(!enabled)("ETAPA 11 — fluxo real no banco relacional", () => {
  beforeAll(async () => {
    const encryptionKey = randomBytes(32).toString("base64");
    const password = "SenhaForte123";
    const company = await registerCompany(
      {
        responsibleName: "Responsável Integração",
        fantasyName: "Empresa Integração",
        legalDocument: validCpf(0),
        phone: `879${digitSeed.slice(0, 8)}`,
        email: `stage11-company-${suffix}@example.test`,
        city: "PETROLINA_PE",
        address: "Rua da Integração",
        addressNumber: "100",
        neighborhood: "Centro",
        password,
        passwordConfirmation: password,
        termsAccepted: true,
        privacyAccepted: true,
      },
      prismaRegistrationRepository,
      encryptionKey,
    );
    companyActor.userId = company.id;
    createdUserIds.push(company.id);
    await prisma.subscription.create({
      data: {
        userId: company.id,
        planId: "15000000-0000-4000-8000-000000000002",
        status: "ACTIVE",
        monthlyPrice: 25,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    await expect(
      authenticateCredentials(
        { email: company.email, password },
        prismaAuthRepository,
      ),
    ).resolves.toMatchObject({ id: company.id, role: "COMPANY" });
    await createOrReplaceDefaultCompanyLocation(
      companyActor,
      {
        label: "Loja principal",
        address: "Rua da Integração",
        number: "100",
        neighborhood: "Centro",
        city: "PETROLINA_PE",
        state: "PE",
        latitude: -9.3891,
        longitude: -40.5031,
      },
      prismaLocationRepository,
    );

    for (const [index, actor] of motoboyActors.entries()) {
      const user = await registerMotoboy(
        {
          name: `Motoboy Integração ${index + 1}`,
          cpf: validCpf(9 + index),
          rg: `RG-${index}-${suffix.slice(0, 10)}`,
          phone: `${88 + index}9${digitSeed.slice(1, 9)}`,
          email: `stage11-motoboy-${index}-${suffix}@example.test`,
          birthDate: "1990-01-01",
          city: "PETROLINA_PE",
          password,
          passwordConfirmation: password,
          termsAccepted: true,
          privacyAccepted: true,
          legalResponsibilityAccepted: true,
          intermediationAccepted: true,
        },
        prismaRegistrationRepository,
        encryptionKey,
      );
      actor.userId = user.id;
      createdUserIds.push(user.id);
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: "15000000-0000-4000-8000-000000000001",
          status: "ACTIVE",
          monthlyPrice: 20,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      await expect(
        authenticateCredentials(
          { email: user.email, password },
          prismaAuthRepository,
        ),
      ).resolves.toMatchObject({ id: user.id, role: "MOTOBOY" });
      await setMotoboyOnline(
        actor,
        { latitude: -9.3892, longitude: -40.5032 },
        prismaPresenceRepository,
        new Date(),
        15,
      );
    }
  });

  afterAll(async () => {
    if (!enabled) return;
    await prisma.report.deleteMany({
      where: { reporterUserId: { in: createdUserIds } },
    });
    await prisma.favorite.deleteMany({
      where: { company: { userId: { in: createdUserIds } } },
    });
    await prisma.rating.deleteMany({
      where: { reviewerUserId: { in: createdUserIds } },
    });
    await prisma.delivery.deleteMany({
      where: { id: { in: createdDeliveryIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.subscriptionEvent.deleteMany({
      where: { subscription: { userId: { in: createdUserIds } } },
    });
    await prisma.subscription.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  });

  it("executa publicação, concorrência atômica, operação, pós-entrega e cancelamento", async () => {
    const now = new Date();
    const delivery = await createDelivery(
      companyActor,
      {
        destinationAddress: "Avenida do Destino",
        destinationNumber: "200",
        destinationNeighborhood: "Areia Branca",
        destinationCity: "PETROLINA_PE",
        destinationState: "PE",
        destinationLatitude: -9.401,
        destinationLongitude: -40.51,
        offeredPrice: 25,
        paymentMethod: "PIX",
        notes: "Teste operacional sem pagamento pela plataforma",
        extras: [
          {
            type: "WAITING",
            description: "Espera prevista de até quinze minutos",
            amount: 5,
          },
        ],
      },
      prismaDeliveryRepository,
      now,
      30,
    );
    createdDeliveryIds.push(delivery.id);
    expect(delivery).not.toHaveProperty("pickupLatitude");
    expect(delivery).not.toHaveProperty("destinationLongitude");
    expect(delivery.distanceMethod).toBe("STRAIGHT_LINE");
    expect(delivery.distanceEstimateKm).toBeGreaterThan(0);
    expect(delivery.suggestedPrice).toBeGreaterThanOrEqual(12);
    expect(delivery.offeredPrice).toBe(25);

    const pricingSnapshot = await prisma.delivery.findUniqueOrThrow({
      where: { id: delivery.id },
      select: {
        pricingRuleId: true,
        suggestedPrice: true,
        offeredPrice: true,
        distanceMethod: true,
      },
    });
    expect(pricingSnapshot.pricingRuleId).not.toBeNull();
    expect(pricingSnapshot.suggestedPrice?.toNumber()).toBe(
      delivery.suggestedPrice,
    );
    expect(pricingSnapshot.offeredPrice.toNumber()).toBe(25);
    expect(pricingSnapshot.distanceMethod).toBe("STRAIGHT_LINE");

    const listed = await listCompanyDeliveries(
      companyActor,
      prismaDeliveryRepository,
    );
    expect(listed.some(({ id }) => id === delivery.id)).toBe(true);
    const opportunities = await listMotoboyOpportunities(
      motoboyActors[0],
      prismaDeliveryRepository,
      now,
      15,
      30,
    );
    expect(opportunities.some(({ id }) => id === delivery.id)).toBe(true);
    expect(opportunities.find(({ id }) => id === delivery.id)).toMatchObject({
      distanceMethod: "STRAIGHT_LINE",
      suggestedPrice: delivery.suggestedPrice,
      offeredPrice: 25,
    });
    expect(
      opportunities.find(({ id }) => id === delivery.id)?.extras,
    ).toContainEqual(
      expect.objectContaining({
        type: "WAITING",
        status: "PENDING",
        amount: 5,
      }),
    );

    await notifyNewOpportunity(delivery.id);
    const race = await Promise.allSettled(
      motoboyActors.map((actor) =>
        acceptDelivery(
          actor,
          delivery.id,
          prismaDeliveryRepository,
          new Date(),
          15,
          30,
          { extrasAcknowledged: true },
        ),
      ),
    );
    expect(race.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(race.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(
      (
        race.find(
          ({ status }) => status === "rejected",
        ) as PromiseRejectedResult
      ).reason,
    ).toBeInstanceOf(DeliveryUnavailableError);
    const winnerIndex = race.findIndex(({ status }) => status === "fulfilled");
    const winner = motoboyActors[winnerIndex];
    const loser = motoboyActors[winnerIndex === 0 ? 1 : 0];
    const accepted = (
      race.find(
        ({ status }) => status === "fulfilled",
      ) as PromiseFulfilledResult<Awaited<ReturnType<typeof acceptDelivery>>>
    ).value;
    expect(accepted.extras).toContainEqual(
      expect.objectContaining({ type: "WAITING", status: "ACKNOWLEDGED" }),
    );

    await prisma.subscription.updateMany({
      where: { userId: winner.userId },
      data: { status: "EXPIRED", currentPeriodEnd: new Date() },
    });
    await expect(
      assertOperationalSubscription(
        winner.userId,
        prismaSubscriptionRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(SubscriptionRequiredError);

    await expect(
      addDeliveryExtra(
        loser,
        delivery.id,
        {
          type: "OTHER",
          description: "Tentativa de participante alheio",
        },
        prismaDeliveryExtraRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryExtraAccessDeniedError);

    const runtimeExtra = await addDeliveryExtra(
      companyActor,
      delivery.id,
      {
        type: "RETURN",
        description: "Retorno solicitado ao ponto de coleta",
        amount: 7,
      },
      prismaDeliveryExtraRepository,
      new Date(),
    );
    await expect(
      respondToDeliveryExtra(
        companyActor,
        delivery.id,
        runtimeExtra.id,
        { decision: "ACKNOWLEDGED" },
        prismaDeliveryExtraRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryExtraAccessDeniedError);
    const acknowledgedExtra = await respondToDeliveryExtra(
      winner,
      delivery.id,
      runtimeExtra.id,
      { decision: "ACKNOWLEDGED" },
      prismaDeliveryExtraRepository,
      new Date(),
    );
    expect(acknowledgedExtra.status).toBe("ACKNOWLEDGED");
    expect(acknowledgedExtra.history).toHaveLength(2);
    await expect(
      respondToDeliveryExtra(
        winner,
        delivery.id,
        runtimeExtra.id,
        { decision: "REJECTED" },
        prismaDeliveryExtraRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryExtraConflictError);

    await expect(
      advanceDeliveryStatus(
        winner,
        delivery.id,
        { status: "COMPLETED" },
        prismaDeliveryRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryTransitionConflictError);
    await expect(
      advanceDeliveryStatus(
        loser,
        delivery.id,
        { status: "MOTOBOY_TO_PICKUP" },
        prismaDeliveryRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryAccessDeniedError);
    await expect(
      getDeliveryDetails(loser, delivery.id, prismaDeliveryRepository),
    ).rejects.toBeInstanceOf(DeliveryAccessDeniedError);

    for (const status of [
      "MOTOBOY_TO_PICKUP",
      "ARRIVED_AT_PICKUP",
      "PICKED_UP",
      "IN_DELIVERY",
      "COMPLETED",
    ] as const) {
      await advanceDeliveryStatus(
        winner,
        delivery.id,
        { status },
        prismaDeliveryRepository,
        new Date(),
      );
    }
    await notifyDeliveryEvent(delivery.id, "completed");
    const persisted = await prisma.delivery.findUniqueOrThrow({
      where: { id: delivery.id },
      select: { status: true, completedAt: true, statusHistory: true },
    });
    expect(persisted.status).toBe("COMPLETED");
    expect(persisted.completedAt).toBeInstanceOf(Date);
    expect(persisted.statusHistory).toHaveLength(7);
    const history = await listActorDeliveryHistory(
      winner,
      {},
      prismaDeliveryRepository,
    );
    expect(history.some(({ id }) => id === delivery.id)).toBe(true);

    await createRating(
      companyActor,
      { deliveryId: delivery.id, score: 5 },
      prismaReputationRepository,
      new Date(),
    );
    await createRating(
      winner,
      { deliveryId: delivery.id, score: 4 },
      prismaReputationRepository,
      new Date(),
    );
    await expect(
      createRating(
        companyActor,
        { deliveryId: delivery.id, score: 5 },
        prismaReputationRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DuplicateRatingError);
    const favorite = await addFavorite(
      companyActor,
      { deliveryId: delivery.id },
      prismaReputationRepository,
      new Date(),
    );
    await removeFavorite(companyActor, favorite.id, prismaReputationRepository);
    await createReport(
      companyActor,
      {
        deliveryId: delivery.id,
        category: "OTHER",
        description:
          "Relato de integração suficientemente detalhado para validação.",
      },
      prismaReputationRepository,
      new Date(),
    );

    const companyHistory = (await listCompanyHistory(
      companyActor,
      { page: 1, pageSize: 20, status: "COMPLETED", query: "Destino" },
      prismaCompanyHistoryRepository,
    )) as {
      items: Array<{ id: string; extras: Array<{ type: string }> }>;
      pagination: { total: number };
    };
    expect(companyHistory.items.map(({ id }) => id)).toContain(delivery.id);
    expect(
      companyHistory.items.find(({ id }) => id === delivery.id)?.extras,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "WAITING" }),
        expect.objectContaining({ type: "RETURN" }),
      ]),
    );
    expect(companyHistory.pagination.total).toBeGreaterThanOrEqual(1);
    const companyDetail = await getCompanyHistoryDetail(
      companyActor,
      delivery.id,
      prismaCompanyHistoryRepository,
    );
    expect(companyDetail).toMatchObject({ id: delivery.id });
    const repeatDraft = await getCompanyRepeatDraft(
      companyActor,
      delivery.id,
      prismaCompanyHistoryRepository,
    );
    expect(repeatDraft).toMatchObject({
      id: delivery.id,
      destinationAddress: "Avenida do Destino",
    });
    const winnerProfile = await prisma.motoboyProfile.findUniqueOrThrow({
      where: { userId: winner.userId },
      select: { id: true },
    });
    const previousMotoboys = (await listCompanyMotoboys(
      companyActor,
      { page: 1, pageSize: 20 },
      prismaCompanyHistoryRepository,
      new Date(),
      15,
    )) as { items: Array<{ id: string; completedWithCompany: number }> };
    expect(previousMotoboys.items).toContainEqual(
      expect.objectContaining({
        id: winnerProfile.id,
        completedWithCompany: 1,
      }),
    );
    const relationship = await getCompanyMotoboyRelationship(
      companyActor,
      winnerProfile.id,
      { page: 1, pageSize: 20 },
      prismaCompanyHistoryRepository,
    );
    expect(relationship).toMatchObject({
      motoboy: { id: winnerProfile.id },
    });

    const notifications = await listNotifications(companyActor.userId, {
      page: 1,
      pageSize: 20,
    });
    expect(notifications.items.length).toBeGreaterThan(0);
    await expect(
      markNotificationRead(companyActor.userId, notifications.items[0].id),
    ).resolves.not.toBeNull();
    await expect(
      markNotificationRead(loser.userId, notifications.items[0].id),
    ).resolves.toBeNull();

    const cancelled = await createDelivery(
      companyActor,
      {
        destinationAddress: "Rua Cancelamento",
        destinationNumber: "10",
        destinationNeighborhood: "Centro",
        destinationCity: "PETROLINA_PE",
        destinationState: "PE",
        destinationLatitude: -9.39,
        destinationLongitude: -40.5,
        offeredPrice: 20,
        paymentMethod: "CASH",
      },
      prismaDeliveryRepository,
      new Date(),
      30,
    );
    createdDeliveryIds.push(cancelled.id);
    const cancelledResult = await cancelDelivery(
      companyActor,
      cancelled.id,
      { reason: "Teste de cancelamento" },
      prismaDeliveryRepository,
      new Date(),
    );
    expect(cancelledResult.status).toBe("CANCELLED_BY_COMPANY");
    await expect(
      createRating(
        companyActor,
        { deliveryId: cancelled.id, score: 5 },
        prismaReputationRepository,
        new Date(),
      ),
    ).rejects.toBeInstanceOf(DeliveryNotEligibleError);
  }, 45_000);
});
