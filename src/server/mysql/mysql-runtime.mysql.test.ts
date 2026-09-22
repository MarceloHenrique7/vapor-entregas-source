import { createHash, randomBytes, randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { authenticateCredentials } from "@/server/auth/authenticate";
import {
  changeCompanyProAccess,
  changeMotoboyPlanAccess,
} from "@/server/admin/admin-service";
import { hashPassword } from "@/server/auth/password";
import { prismaAuthRepository } from "@/server/auth/prisma-auth-repository";
import { getSessionUserByToken } from "@/server/auth/session-lookup";
import {
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/session-token";
import {
  getCompanyPlanOverview,
  getCompanyProOverview,
} from "@/server/company-pro/company-pro-service";
import { getPrisma } from "@/server/db/prisma";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { createPreRegistration } from "@/server/pre-registration/pre-registration-service";
import { prismaPreRegistrationRepository } from "@/server/pre-registration/prisma-pre-registration-repository";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import { prismaRegistrationRepository } from "@/server/registration/prisma-registration-repository";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { prismaTrackingRepository } from "@/server/tracking/prisma-tracking-repository";
import {
  createOrGetTrackingLink,
  getPublicTracking,
  updateDeliveryTrackingLocation,
} from "@/server/tracking/tracking-service";

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

  it("preserva e relaciona o pré-cadastro quando a conta é criada", async () => {
    const suffix = digest(randomUUID()).slice(0, 8).replace(/[a-f]/g, "7");
    const normalizedPhone = `+55879${suffix}`;
    const email = `converted-${randomUUID()}@example.test`;
    let userId: string | undefined;

    try {
      await createPreRegistration(
        {
          name: "Empresa Convertida MySQL",
          phone: normalizedPhone,
          type: "COMPANY",
        },
        prismaPreRegistrationRepository,
      );
      const user = await prismaRegistrationRepository.createCompany({
        role: "COMPANY",
        name: "Responsável da Empresa",
        email,
        phone: normalizedPhone,
        passwordHash: "integration-only",
        termsVersion: "mysql-test",
        privacyVersion: "mysql-test",
        registeredAt: new Date(),
        profile: {
          fantasyName: "Empresa Convertida MySQL",
          documentType: "CNPJ",
          legalDocumentEncrypted: "encrypted",
          legalDocumentHash: digest(email),
          legalDocumentLastDigits: "0001",
          city: "PETROLINA_PE",
          address: "Rua de Teste",
          addressNumber: "10",
          neighborhood: "Centro",
        },
      });
      userId = user.id;
      await expect(
        prisma.preRegistration.findUnique({
          where: {
            normalizedPhone_type: {
              normalizedPhone,
              type: "COMPANY",
            },
          },
          select: { convertedUserId: true },
        }),
      ).resolves.toEqual({ convertedUserId: user.id });
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await prisma.preRegistration.deleteMany({
        where: { normalizedPhone, type: "COMPANY" },
      });
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

      const winnerIndex = motoboyProfiles.indexOf(persisted.motoboyId!);
      const trackingConfig = {
        appUrl: "https://tracking.mysql.test",
        encryptionKey: randomBytes(32).toString("base64"),
        linkTtlHours: 72,
        terminalTtlHours: 24,
        locationMinIntervalSeconds: 10,
        locationStaleSeconds: 60,
      };
      const link = await createOrGetTrackingLink(
        { userId: companyUserId, role: "COMPANY" },
        deliveryId,
        prismaTrackingRepository,
        now,
        trackingConfig,
      );
      expect(link.state).toBe("ACTIVE");
      expect(link.url).toMatch(/^https:\/\/tracking\.mysql\.test\/r\//);

      await prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: "IN_DELIVERY" },
      });
      await updateDeliveryTrackingLocation(
        { userId: motoboyUsers[winnerIndex], role: "MOTOBOY" },
        deliveryId,
        {
          latitude: -9.3891,
          longitude: -40.5031,
          accuracyMeters: 8.5,
          capturedAt: now.toISOString(),
        },
        prismaTrackingRepository,
        now,
        trackingConfig,
      );

      const trackingToken = new URL(link.url!).pathname.split("/").at(-1)!;
      await expect(
        getPublicTracking(
          trackingToken,
          prismaTrackingRepository,
          now,
          trackingConfig,
        ),
      ).resolves.toMatchObject({
        state: "LIVE",
        companyName: "Empresa Concorrência MySQL",
        location: {
          latitude: -9.3891,
          longitude: -40.5031,
          accuracyMeters: 8.5,
        },
      });
      await expect(
        prisma.deliveryTracking.findUniqueOrThrow({
          where: { deliveryId },
          select: {
            tokenHash: true,
            lastLatitude: true,
            lastLongitude: true,
            lastAccuracyMeters: true,
          },
        }),
      ).resolves.toMatchObject({ tokenHash: digest(trackingToken) });
      await expect(
        prisma.deliveryTracking.create({
          data: {
            deliveryId,
            tokenHash: digest(`duplicate-${trackingToken}`),
            tokenEncrypted: "integration-only",
            expiresAt: new Date(now.getTime() + 60 * 60_000),
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
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

  it("persiste o fluxo VaporPay e agrega os dados da empresa Pro", async () => {
    const companyUserId = randomUUID();
    const companyId = randomUUID();
    const locationId = randomUUID();
    const motoboyUserId = randomUUID();
    const motoboyId = randomUUID();
    const deliveryId = randomUUID();
    const now = new Date();

    try {
      await prisma.user.create({
        data: {
          id: companyUserId,
          role: "COMPANY",
          status: "ACTIVE",
          name: "Empresa VaporPay MySQL",
          email: `vaporpay-company-${companyUserId}@example.test`,
          phone: `+55${digest(companyUserId).slice(0, 11)}`,
          passwordHash: "integration-only",
          companyProfile: {
            create: {
              id: companyId,
              fantasyName: "Empresa VaporPay MySQL",
              documentType: "CNPJ",
              legalDocumentEncrypted: "integration-only",
              legalDocumentHash: digest(`vaporpay-company:${companyId}`),
              legalDocumentLastDigits: "0001",
              city: "PETROLINA_PE",
              proEnabled: true,
              proEnabledAt: now,
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
          address: "Rua de Integracao",
          number: "100",
          neighborhood: "Centro",
          city: "PETROLINA_PE",
          state: "PE",
          latitude: -9.3891,
          longitude: -40.5031,
          isDefault: true,
        },
      });
      await prisma.user.create({
        data: {
          id: motoboyUserId,
          role: "MOTOBOY",
          status: "ACTIVE",
          name: "Motoboy VaporPay MySQL",
          email: `vaporpay-motoboy-${motoboyUserId}@example.test`,
          phone: `+55${digest(motoboyUserId).slice(0, 11)}`,
          passwordHash: "integration-only",
          motoboyProfile: {
            create: {
              id: motoboyId,
              cpfEncrypted: "integration-only",
              cpfHash: digest(`vaporpay-cpf:${motoboyId}`),
              cpfLastDigits: "00",
              rgEncrypted: "integration-only",
              rgHash: digest(`vaporpay-rg:${motoboyId}`),
              birthDate: new Date("1990-01-01T00:00:00.000Z"),
              city: "PETROLINA_PE",
              legalResponsibilityAcceptedAt: now,
              intermediationAcceptedAt: now,
            },
          },
        },
      });
      await prisma.delivery.create({
        data: {
          id: deliveryId,
          companyId,
          motoboyId,
          pickupLocationId: locationId,
          pickupLabel: "Loja principal",
          pickupAddress: "Rua de Integracao",
          pickupNumber: "100",
          pickupNeighborhood: "Centro",
          pickupCity: "PETROLINA_PE",
          pickupState: "PE",
          pickupLatitude: -9.3891,
          pickupLongitude: -40.5031,
          destinationAddress: "Avenida de Integracao",
          destinationNumber: "200",
          destinationNeighborhood: "Centro",
          destinationCity: "PETROLINA_PE",
          destinationState: "PE",
          destinationLatitude: -9.39,
          destinationLongitude: -40.5,
          distanceEstimateKm: 2,
          offeredPrice: 20,
          paymentMethod: "PIX",
          paymentStatus: "PENDING",
          paymentStatusUpdatedAt: now,
          status: "COMPLETED",
          completedAt: now,
          expiresAt: new Date(now.getTime() + 10 * 60_000),
        },
      });

      await expect(
        prismaDeliveryRepository.updateDeliveryPaymentAtomically(
          companyUserId,
          "COMPANY",
          deliveryId,
          "MARK_PAID",
          undefined,
          now,
        ),
      ).resolves.toMatchObject({
        kind: "updated",
        changed: true,
        delivery: { paymentStatus: "REPORTED_PAID" },
      });
      await expect(
        prismaDeliveryRepository.updateDeliveryPaymentAtomically(
          motoboyUserId,
          "MOTOBOY",
          deliveryId,
          "CONFIRM_RECEIPT",
          undefined,
          new Date(now.getTime() + 1_000),
        ),
      ).resolves.toMatchObject({
        kind: "updated",
        changed: true,
        delivery: { paymentStatus: "CONFIRMED" },
      });
      await expect(
        prisma.deliveryPaymentEvent.count({ where: { deliveryId } }),
      ).resolves.toBe(2);

      const overview = await getCompanyProOverview(
        companyUserId,
        { period: "30d" },
        now,
      );
      expect(overview.metrics).toMatchObject({
        totalDeliveries: 1,
        completedDeliveries: 1,
        totalRecordedSpend: 20,
        confirmedPayments: 1,
        pendingPayments: 0,
      });
    } finally {
      await prisma.deliveryPaymentEvent.deleteMany({ where: { deliveryId } });
      await prisma.delivery.deleteMany({ where: { id: deliveryId } });
      await prisma.companyLocation.deleteMany({ where: { id: locationId } });
      await prisma.motoboyProfile.deleteMany({ where: { id: motoboyId } });
      await prisma.companyProfile.deleteMany({ where: { id: companyId } });
      await prisma.user.deleteMany({
        where: { id: { in: [companyUserId, motoboyUserId] } },
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

  it("concede e revoga acessos administrativos sem criar receita fictícia", async () => {
    const adminId = randomUUID();
    const motoboyId = randomUUID();
    const companyId = randomUUID();
    const companyProfileId = randomUUID();
    const now = new Date("2026-09-17T02:30:00.000Z");
    const actor = { userId: adminId, role: "ADMIN", status: "ACTIVE" } as const;
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({
      where: { role: "MOTOBOY" },
      select: { id: true },
    });
    try {
      await prisma.user.createMany({
        data: [
          {
            id: adminId,
            role: "ADMIN",
            status: "ACTIVE",
            name: "Admin Acesso MySQL",
            email: `admin-access-${adminId}@example.test`,
            phone: `+55${digest(adminId).slice(0, 11)}`,
            passwordHash: "integration-only",
          },
          {
            id: motoboyId,
            role: "MOTOBOY",
            status: "ACTIVE",
            name: "Motoboy Acesso MySQL",
            email: `motoboy-access-${motoboyId}@example.test`,
            phone: `+55${digest(motoboyId).slice(0, 11)}`,
            passwordHash: "integration-only",
          },
          {
            id: companyId,
            role: "COMPANY",
            status: "ACTIVE",
            name: "Empresa Pro MySQL",
            email: `company-pro-${companyId}@example.test`,
            phone: `+55${digest(companyId).slice(0, 11)}`,
            passwordHash: "integration-only",
          },
        ],
      });
      await prisma.companyProfile.create({
        data: {
          id: companyProfileId,
          userId: companyId,
          fantasyName: "Empresa Pro MySQL",
          documentType: "CNPJ",
          legalDocumentEncrypted: "integration-only",
          legalDocumentHash: digest(`pro:${companyId}`),
          legalDocumentLastDigits: "0001",
          city: "PETROLINA_PE",
        },
      });

      await changeMotoboyPlanAccess(
        actor,
        motoboyId,
        {
          action: "GRANT",
          planId: plan.id,
          days: 30,
          reasonType: "COURTESY",
          reason: "Cortesia validada no teste de integração",
        },
        now,
      );
      await expect(
        prismaSubscriptionRepository.hasOperationalSubscription(motoboyId, now),
      ).resolves.toBe(true);
      await expect(
        prisma.subscriptionPayment.count({ where: { userId: motoboyId } }),
      ).resolves.toBe(0);
      await changeMotoboyPlanAccess(
        actor,
        motoboyId,
        {
          action: "EXTEND",
          days: 15,
          reason: "Extensão aprovada no teste de integração",
        },
        new Date(now.getTime() + 1_000),
      );
      await changeMotoboyPlanAccess(
        actor,
        motoboyId,
        {
          action: "REVOKE",
          reason: "Revogação confirmada no teste de integração",
        },
        new Date(now.getTime() + 2_000),
      );
      await expect(
        prismaSubscriptionRepository.hasOperationalSubscription(
          motoboyId,
          new Date(now.getTime() + 3_000),
        ),
      ).resolves.toBe(false);

      await changeCompanyProAccess(
        actor,
        companyId,
        {
          action: "ENABLE",
          days: 30,
          indefinite: false,
          source: "TEST",
          reason: "Liberação Pro para teste de integração",
        },
        now,
      );
      await expect(
        getCompanyPlanOverview(companyId, now),
      ).resolves.toMatchObject({
        currentPlan: "PRO",
        proEffective: true,
        checkoutAvailable: false,
        proPrice: null,
      });
      await changeCompanyProAccess(
        actor,
        companyId,
        {
          action: "DISABLE",
          indefinite: false,
          reason: "Remoção Pro para teste de integração",
        },
        new Date(now.getTime() + 1_000),
      );
      await expect(
        getCompanyPlanOverview(companyId, new Date(now.getTime() + 2_000)),
      ).resolves.toMatchObject({ currentPlan: "FREE", proEffective: false });
      await expect(
        prisma.adminAction.count({
          where: {
            adminUserId: adminId,
            actionType: {
              in: [
                "MOTOBOY_PLAN_GRANTED",
                "MOTOBOY_PLAN_EXTENDED",
                "MOTOBOY_PLAN_REVOKED",
                "COMPANY_PRO_ENABLED",
                "COMPANY_PRO_DISABLED",
              ],
            },
          },
        }),
      ).resolves.toBe(5);
    } finally {
      await prisma.adminAction.deleteMany({ where: { adminUserId: adminId } });
      await prisma.manualAccessGrant.deleteMany({
        where: { userId: motoboyId },
      });
      await prisma.companyProfile.deleteMany({
        where: { id: companyProfileId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, motoboyId, companyId] } },
      });
    }
  });

  it("mostra avaliações recebidas somente ao avaliado e com nome público", async () => {
    const companyUserId = randomUUID();
    const companyId = randomUUID();
    const locationId = randomUUID();
    const motoboyUserId = randomUUID();
    const motoboyId = randomUUID();
    const otherMotoboyUserId = randomUUID();
    const otherMotoboyId = randomUUID();
    const deliveryId = randomUUID();
    const now = new Date();
    try {
      await prisma.user.create({
        data: {
          id: companyUserId,
          role: "COMPANY",
          status: "ACTIVE",
          name: "Responsável da Empresa",
          email: `rating-company-${companyUserId}@example.test`,
          phone: `+55${digest(companyUserId).slice(0, 11)}`,
          passwordHash: "integration-only",
          companyProfile: {
            create: {
              id: companyId,
              fantasyName: "Mercado Público MySQL",
              documentType: "CNPJ",
              legalDocumentEncrypted: "integration-only",
              legalDocumentHash: digest(`rating-company:${companyId}`),
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
          label: "Loja",
          address: "Rua Teste",
          number: "1",
          neighborhood: "Centro",
          city: "PETROLINA_PE",
          state: "PE",
          latitude: -9.3891,
          longitude: -40.5031,
          isDefault: true,
        },
      });
      for (const [userId, profileId, label] of [
        [motoboyUserId, motoboyId, "Avaliado"],
        [otherMotoboyUserId, otherMotoboyId, "Terceiro"],
      ] as const) {
        await prisma.user.create({
          data: {
            id: userId,
            role: "MOTOBOY",
            status: "ACTIVE",
            name: `Motoboy ${label}`,
            email: `rating-${label.toLowerCase()}-${userId}@example.test`,
            phone: `+55${digest(userId).slice(0, 11)}`,
            passwordHash: "integration-only",
            motoboyProfile: {
              create: {
                id: profileId,
                cpfEncrypted: "integration-only",
                cpfHash: digest(`rating-cpf:${profileId}`),
                cpfLastDigits: "00",
                rgEncrypted: "integration-only",
                rgHash: digest(`rating-rg:${profileId}`),
                birthDate: new Date("1990-01-01T00:00:00.000Z"),
                city: "PETROLINA_PE",
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
          motoboyId,
          pickupLocationId: locationId,
          pickupLabel: "Loja",
          pickupAddress: "Rua Teste",
          pickupNumber: "1",
          pickupNeighborhood: "Centro",
          pickupCity: "PETROLINA_PE",
          pickupState: "PE",
          pickupLatitude: -9.3891,
          pickupLongitude: -40.5031,
          destinationAddress: "Rua Destino",
          destinationNumber: "2",
          destinationNeighborhood: "Centro",
          destinationCity: "PETROLINA_PE",
          destinationState: "PE",
          destinationLatitude: -9.39,
          destinationLongitude: -40.5,
          distanceEstimateKm: 2,
          offeredPrice: 20,
          paymentMethod: "PIX",
          status: "COMPLETED",
          completedAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
          ratings: {
            create: {
              reviewerUserId: companyUserId,
              reviewedUserId: motoboyUserId,
              reviewerRole: "COMPANY",
              score: 5,
              comment: "Entrega excelente e cuidadosa",
              createdAt: now,
            },
          },
        },
      });
      await expect(
        prismaReputationRepository.getRatingOverview(motoboyUserId, "MOTOBOY"),
      ).resolves.toMatchObject({
        receivedItems: [
          {
            deliveryId,
            reviewerName: "Mercado Público MySQL",
            score: 5,
            comment: "Entrega excelente e cuidadosa",
          },
        ],
      });
      await expect(
        prismaReputationRepository.getRatingOverview(
          otherMotoboyUserId,
          "MOTOBOY",
        ),
      ).resolves.toMatchObject({ receivedItems: [] });
    } finally {
      await prisma.rating.deleteMany({ where: { deliveryId } });
      await prisma.delivery.deleteMany({ where: { id: deliveryId } });
      await prisma.companyLocation.deleteMany({ where: { id: locationId } });
      await prisma.motoboyProfile.deleteMany({
        where: { id: { in: [motoboyId, otherMotoboyId] } },
      });
      await prisma.companyProfile.deleteMany({ where: { id: companyId } });
      await prisma.user.deleteMany({
        where: {
          id: { in: [companyUserId, motoboyUserId, otherMotoboyUserId] },
        },
      });
    }
  });
});
