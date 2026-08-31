import { createHash, randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { authenticateCredentials } from "@/server/auth/authenticate";
import { hashPassword } from "@/server/auth/password";
import { prismaAuthRepository } from "@/server/auth/prisma-auth-repository";
import { getSessionUserByToken } from "@/server/auth/session-lookup";
import {
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/session-token";
import { getPrisma } from "@/server/db/prisma";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { createPreRegistration } from "@/server/pre-registration/pre-registration-service";
import { prismaPreRegistrationRepository } from "@/server/pre-registration/prisma-pre-registration-repository";

const mysqlTestUrl = process.env.MYSQL_TEST_DATABASE_URL;

if (!mysqlTestUrl) {
  throw new Error(
    "MYSQL_TEST_DATABASE_URL é obrigatória para o teste de integração MySQL.",
  );
}

process.env.DATABASE_URL = mysqlTestUrl;
process.env.SESSION_TTL_DAYS ??= "7";

const prisma = getPrisma();

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("runtime real MySQL", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persiste autenticação, sessão e pré-cadastro deduplicado", async () => {
    const suffix = randomUUID().slice(0, 8);
    const userId = randomUUID();
    const email = `mysql-${suffix}@example.test`;
    const phone = `+55879${suffix.replace(/[^0-9]/g, "").padEnd(8, "0")}`;
    const password = "Senha MySQL Teste 2026!";
    const rawPhone = `879${suffix.replace(/[^0-9]/g, "").padEnd(8, "0")}`;
    const normalizedPhone = `+55${rawPhone}`;

    try {
      await prisma.user.create({
        data: {
          id: userId,
          role: "COMPANY",
          status: "ACTIVE",
          name: "Empresa MySQL Teste",
          email,
          phone,
          passwordHash: await hashPassword(password),
        },
      });

      await expect(
        authenticateCredentials(
          { email, password },
          prismaAuthRepository,
          new Date(),
        ),
      ).resolves.toMatchObject({ id: userId, role: "COMPANY" });

      const token = createSessionToken();
      await prisma.session.create({
        data: {
          userId,
          tokenHash: hashSessionToken(token),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await expect(getSessionUserByToken(token)).resolves.toMatchObject({
        id: userId,
        role: "COMPANY",
      });

      const input = {
        name: "Interessado MySQL",
        phone: rawPhone,
        type: "MOTOBOY" as const,
      };
      await expect(
        createPreRegistration(input, prismaPreRegistrationRepository),
      ).resolves.toEqual({ created: true });
      await expect(
        createPreRegistration(input, prismaPreRegistrationRepository),
      ).resolves.toEqual({ created: false });
      await expect(
        prisma.preRegistration.count({
          where: { normalizedPhone, type: "MOTOBOY" },
        }),
      ).resolves.toBe(1);
    } finally {
      await prisma.preRegistration.deleteMany({
        where: { normalizedPhone, type: "MOTOBOY" },
      });
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("permite somente um vencedor quando dois motoboys aceitam a mesma entrega", async () => {
    const companyUserId = randomUUID();
    const companyId = randomUUID();
    const locationId = randomUUID();
    const deliveryId = randomUUID();
    const motoboyUsers = [randomUUID(), randomUUID()];
    const motoboyProfiles = [randomUUID(), randomUUID()];
    const now = new Date();

    try {
      await prisma.user.create({
        data: {
          id: companyUserId,
          role: "COMPANY",
          status: "ACTIVE",
          name: "Empresa Concorrência MySQL",
          email: `company-${companyUserId}@example.test`,
          phone: `+55${digest(companyUserId).slice(0, 11)}`,
          passwordHash: "integration-only",
          companyProfile: {
            create: {
              id: companyId,
              fantasyName: "Empresa Concorrência MySQL",
              documentType: "CNPJ",
              legalDocumentEncrypted: "integration-only",
              legalDocumentHash: digest(`company:${companyId}`),
              legalDocumentLastDigits: "0001",
              city: "PETROLINA_PE",
            },
          },
        },
      });

      await prisma.companyLocation.create({
        data: {
          id: locationId,
          companyId,
          defaultCompanyKey: companyId,
          label: "Loja principal",
          address: "Rua de Integração",
          number: "100",
          neighborhood: "Centro",
          city: "PETROLINA_PE",
          state: "PE",
          latitude: -9.3891,
          longitude: -40.5031,
          isDefault: true,
        },
      });

      for (const [index, userId] of motoboyUsers.entries()) {
        const profileId = motoboyProfiles[index];
        await prisma.user.create({
          data: {
            id: userId,
            role: "MOTOBOY",
            status: "ACTIVE",
            name: `Motoboy MySQL ${index + 1}`,
            email: `motoboy-${userId}@example.test`,
            phone: `+55${digest(userId).slice(0, 11)}`,
            passwordHash: "integration-only",
            motoboyProfile: {
              create: {
                id: profileId,
                cpfEncrypted: "integration-only",
                cpfHash: digest(`cpf:${profileId}`),
                cpfLastDigits: `${index + 1}`.padStart(2, "0"),
                rgEncrypted: "integration-only",
                rgHash: digest(`rg:${profileId}`),
                birthDate: new Date("1990-01-01T00:00:00.000Z"),
                city: "PETROLINA_PE",
                isOnline: true,
                onlineSince: now,
                lastLocationAt: now,
                lastLatitude: -9.3891,
                lastLongitude: -40.5031,
                legalResponsibilityAcceptedAt: now,
                intermediationAcceptedAt: now,
              },
            },
          },
        });
      }

      await prisma.delivery.create({
        data: {
          id: deliveryId,
          companyId,
          pickupLocationId: locationId,
          pickupLabel: "Loja principal",
          pickupAddress: "Rua de Integração",
          pickupNumber: "100",
          pickupNeighborhood: "Centro",
          pickupCity: "PETROLINA_PE",
          pickupState: "PE",
          pickupLatitude: -9.3891,
          pickupLongitude: -40.5031,
          destinationAddress: "Avenida de Integração",
          destinationNumber: "200",
          destinationNeighborhood: "Centro",
          destinationCity: "PETROLINA_PE",
          destinationState: "PE",
          destinationLatitude: -9.39,
          destinationLongitude: -40.5,
          distanceEstimateKm: 1.5,
          offeredPrice: 15,
          paymentMethod: "PIX",
          status: "SEARCHING_MOTOBOY",
          expiresAt: new Date(now.getTime() + 10 * 60_000),
        },
      });

      const results = await Promise.all(
        motoboyUsers.map((userId) =>
          prismaDeliveryRepository.acceptDeliveryAtomically(
            userId,
            deliveryId,
            now,
            new Date(now.getTime() - 10 * 60_000),
            50,
            true,
          ),
        ),
      );

      expect(
        results.filter((result) => result.kind === "accepted"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.kind === "unavailable"),
      ).toHaveLength(1);

      const persisted = await prisma.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
        select: { status: true, motoboyId: true, activeMotoboyKey: true },
      });
      expect(persisted.status).toBe("ACCEPTED");
      expect(motoboyProfiles).toContain(persisted.motoboyId);
      expect(persisted.activeMotoboyKey).toBe(persisted.motoboyId);
      await expect(
        prisma.deliveryStatusHistory.count({
          where: { deliveryId, newStatus: "ACCEPTED" },
        }),
      ).resolves.toBe(1);
    } finally {
      await prisma.deliveryStatusHistory.deleteMany({ where: { deliveryId } });
      await prisma.delivery.deleteMany({ where: { id: deliveryId } });
      await prisma.companyLocation.deleteMany({ where: { id: locationId } });
      await prisma.motoboyProfile.deleteMany({
        where: { id: { in: motoboyProfiles } },
      });
      await prisma.companyProfile.deleteMany({ where: { id: companyId } });
      await prisma.user.deleteMany({
        where: { id: { in: [companyUserId, ...motoboyUsers] } },
      });
    }
  });

  it("persiste assinatura pausada e deduplica pagamento recorrente", async () => {
    const userId = randomUUID();
    const subscriptionId = randomUUID();
    const paymentId = randomUUID();
    const providerPaymentId = `mysql-payment-${randomUUID()}`;
    try {
      const plan = await prisma.subscriptionPlan.findUniqueOrThrow({
        where: { role: "COMPANY" },
        select: { id: true },
      });
      await prisma.user.create({
        data: {
          id: userId,
          role: "COMPANY",
          status: "ACTIVE",
          name: "Empresa Assinatura MySQL",
          email: `subscription-${userId}@example.test`,
          phone: `+55${digest(userId).slice(0, 11)}`,
          passwordHash: "integration-only",
        },
      });
      await prisma.subscription.create({
        data: {
          id: subscriptionId,
          userId,
          planId: plan.id,
          externalReference: `subscription:${subscriptionId}`,
          providerPlanId: `provider-plan-${subscriptionId}`,
          providerSubscriptionId: `preapproval-${subscriptionId}`,
          providerStatus: "paused",
          status: "PAUSED",
          monthlyPrice: 29.9,
          openSubscriptionUserKey: userId,
        },
      });
      await prisma.subscriptionPayment.create({
        data: {
          id: paymentId,
          subscriptionId,
          providerPaymentId,
          amount: 29.9,
          currency: "BRL",
          status: "rejected",
        },
      });
      await expect(
        prisma.subscriptionPayment.create({
          data: {
            subscriptionId,
            providerPaymentId,
            amount: 29.9,
            currency: "BRL",
            status: "rejected",
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
      await expect(
        prisma.subscription.findUniqueOrThrow({
          where: { id: subscriptionId },
          select: { status: true, payments: { select: { id: true } } },
        }),
      ).resolves.toMatchObject({
        status: "PAUSED",
        payments: [{ id: paymentId }],
      });
    } finally {
      await prisma.subscriptionPayment.deleteMany({
        where: { subscriptionId },
      });
      await prisma.subscriptionEvent.deleteMany({ where: { subscriptionId } });
      await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });
});
