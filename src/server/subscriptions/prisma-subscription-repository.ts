import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import type {
  ProviderSubscription,
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionRepository,
  SubscriptionStatus,
} from "./types";

const planSelect = {
  id: true,
  role: true,
  name: true,
  description: true,
  monthlyPrice: true,
  active: true,
  trialDays: true,
  externalPlanId: true,
  externalPlanMode: true,
  createdAt: true,
  updatedAt: true,
} as const;

const subscriptionSelect = {
  id: true,
  userId: true,
  planId: true,
  externalReference: true,
  providerPlanId: true,
  providerSubscriptionId: true,
  providerStatus: true,
  status: true,
  monthlyPrice: true,
  checkoutUrl: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  nextPaymentAt: true,
  trialGrantedAt: true,
  trialEndsAt: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
  plan: { select: planSelect },
  events: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    select: {
      id: true,
      eventType: true,
      processedAt: true,
      createdAt: true,
    },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 24,
    select: {
      id: true,
      providerAuthorizedPaymentId: true,
      providerPaymentId: true,
      providerStatusDetail: true,
      paymentMethod: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      expiresAt: true,
      accessGrantedAt: true,
      providerCreatedAt: true,
      createdAt: true,
    },
  },
} as const;

type PlanValue = {
  id: string;
  role: "MOTOBOY" | "COMPANY" | "ADMIN";
  name: string;
  description: string;
  monthlyPrice: { toNumber(): number };
  active: boolean;
  trialDays: number;
  externalPlanId: string | null;
  externalPlanMode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPlan(plan: PlanValue): SubscriptionPlanRecord {
  if (plan.role === "ADMIN") throw new Error("Plano administrativo invalido.");
  return {
    ...plan,
    role: plan.role,
    monthlyPrice: plan.monthlyPrice.toNumber(),
  };
}

function toSubscription(value: {
  id: string;
  userId: string;
  planId: string;
  externalReference: string | null;
  providerPlanId: string | null;
  providerSubscriptionId: string | null;
  providerStatus: string | null;
  status: SubscriptionStatus;
  monthlyPrice: { toNumber(): number };
  checkoutUrl: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextPaymentAt: Date | null;
  trialGrantedAt: Date | null;
  trialEndsAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  plan: PlanValue;
  events: Array<{
    id: string;
    eventType: string;
    processedAt: Date | null;
    createdAt: Date;
  }>;
  payments: Array<{
    id: string;
    providerAuthorizedPaymentId: string | null;
    providerPaymentId: string | null;
    providerStatusDetail: string | null;
    paymentMethod: string | null;
    amount: { toNumber(): number };
    currency: string;
    status: string;
    paidAt: Date | null;
    expiresAt: Date | null;
    accessGrantedAt: Date | null;
    providerCreatedAt: Date | null;
    createdAt: Date;
  }>;
}): SubscriptionRecord {
  return {
    ...value,
    monthlyPrice: value.monthlyPrice.toNumber(),
    plan: toPlan(value.plan),
    payments: value.payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toNumber(),
    })),
  };
}

const providerData = (
  provider: ProviderSubscription,
  status: SubscriptionStatus,
  canceledAt: Date | null,
) => ({
  providerSubscriptionId: provider.id,
  providerPlanId: provider.planId,
  providerStatus: provider.status,
  status,
  checkoutUrl: provider.checkoutUrl,
  currentPeriodStart: provider.currentPeriodStart,
  currentPeriodEnd: provider.currentPeriodEnd,
  nextPaymentAt: provider.nextPaymentAt,
  canceledAt,
  openSubscriptionUserKey:
    status === "CANCELED" || status === "EXPIRED" ? null : undefined,
});

function isUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const prismaSubscriptionRepository: SubscriptionRepository = {
  async listPlans() {
    return (
      await getPrisma().subscriptionPlan.findMany({
        orderBy: { monthlyPrice: "asc" },
        select: planSelect,
      })
    ).map(toPlan);
  },
  async getPlanForRole(role) {
    const plan = await getPrisma().subscriptionPlan.findUnique({
      where: { role },
      select: planSelect,
    });
    return plan ? toPlan(plan) : null;
  },
  async getBillingUser(userId) {
    return getPrisma().user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
  },
  async getLatest(userId) {
    const value = await getPrisma().subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: subscriptionSelect,
    });
    return value ? toSubscription(value) : null;
  },
  async getCurrent(userId) {
    const value = await getPrisma().subscription.findFirst({
      where: {
        userId,
        status: { in: ["TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "PAUSED"] },
      },
      orderBy: { createdAt: "desc" },
      select: subscriptionSelect,
    });
    return value ? toSubscription(value) : null;
  },
  async hasPriorSubscription(userId, excludeSubscriptionId) {
    return Boolean(
      await getPrisma().subscription.findFirst({
        where: {
          userId,
          ...(excludeSubscriptionId
            ? { id: { not: excludeSubscriptionId } }
            : {}),
        },
        select: { id: true },
      }),
    );
  },
  async findById(id) {
    const value = await getPrisma().subscription.findUnique({
      where: { id },
      select: subscriptionSelect,
    });
    return value ? toSubscription(value) : null;
  },
  async findByExternalReference(externalReference) {
    const value = await getPrisma().subscription.findUnique({
      where: { externalReference },
      select: subscriptionSelect,
    });
    return value ? toSubscription(value) : null;
  },
  async saveProviderPlan(planId, providerPlanId, mode) {
    return toPlan(
      await getPrisma().subscriptionPlan.update({
        where: { id: planId },
        data: { externalPlanId: providerPlanId, externalPlanMode: mode },
        select: planSelect,
      }),
    );
  },
  async createTrial(userId, plan, startsAt, endsAt) {
    return toSubscription(
      await getPrisma().subscription.create({
        data: {
          userId,
          openSubscriptionUserKey: userId,
          planId: plan.id,
          status: "TRIAL",
          monthlyPrice: plan.monthlyPrice,
          currentPeriodStart: startsAt,
          currentPeriodEnd: endsAt,
          trialGrantedAt: startsAt,
          trialEndsAt: endsAt,
          nextPaymentAt: endsAt,
          events: {
            create: {
              providerEventId: `local:trial:${userId}:${startsAt.toISOString()}`,
              eventType: "trial.started",
              processedAt: startsAt,
              payloadMetadata: { trialDays: plan.trialDays },
            },
          },
        },
        select: subscriptionSelect,
      }),
    );
  },
  async createDraft(userId, plan, now) {
    const id = randomUUID();
    try {
      return toSubscription(
        await getPrisma().subscription.create({
          data: {
            id,
            userId,
            externalReference: `subscription:${id}`,
            openSubscriptionUserKey: userId,
            planId: plan.id,
            status: "PENDING",
            monthlyPrice: plan.monthlyPrice,
            createdAt: now,
          },
          select: subscriptionSelect,
        }),
      );
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      const existing = await getPrisma().subscription.findFirst({
        where: { userId, openSubscriptionUserKey: userId },
        orderBy: { createdAt: "desc" },
        select: subscriptionSelect,
      });
      if (!existing) throw error;
      return toSubscription(existing);
    }
  },
  async attachProvider(subscriptionId, provider, status) {
    return toSubscription(
      await getPrisma().subscription.update({
        where: { id: subscriptionId },
        data: providerData(
          provider,
          status,
          status === "CANCELED" ? new Date() : null,
        ),
        select: subscriptionSelect,
      }),
    );
  },
  async expireDraft(subscriptionId, now) {
    await getPrisma().subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "EXPIRED",
        currentPeriodEnd: now,
        openSubscriptionUserKey: null,
      },
    });
  },
  async findByProviderId(providerId) {
    const value = await getPrisma().subscription.findUnique({
      where: { providerSubscriptionId: providerId },
      select: subscriptionSelect,
    });
    return value ? toSubscription(value) : null;
  },
  async updateFromProvider(subscriptionId, provider, status, now) {
    return toSubscription(
      await getPrisma().subscription.update({
        where: { id: subscriptionId },
        data: providerData(
          provider,
          status,
          status === "CANCELED" ? now : null,
        ),
        select: subscriptionSelect,
      }),
    );
  },
  async cancelLocal(subscriptionId, now) {
    return toSubscription(
      await getPrisma().subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "CANCELED",
          canceledAt: now,
          openSubscriptionUserKey: null,
          events: {
            create: {
              providerEventId: `local:cancel:${subscriptionId}:${now.toISOString()}`,
              eventType: "subscription.canceled.local",
              processedAt: now,
            },
          },
        },
        select: subscriptionSelect,
      }),
    );
  },
  async applyProviderEvent(input) {
    try {
      return await getPrisma().$transaction(async (transaction) => {
        await transaction.subscriptionEvent.create({
          data: {
            subscriptionId: input.subscriptionId,
            providerEventId: input.providerEventId,
            eventType: input.eventType,
            payloadMetadata: {
              resourceId: input.providerResourceId,
              providerStatus: input.providerStatus,
              paymentStatus: input.payment?.status ?? null,
            },
            processedAt: input.processedAt,
          },
        });

        if (
          input.subscriptionId &&
          input.providerSubscription &&
          input.subscriptionStatus
        ) {
          const subscription = await transaction.subscription.findUniqueOrThrow(
            {
              where: { id: input.subscriptionId },
              select: { userId: true },
            },
          );
          await transaction.subscription.update({
            where: { id: input.subscriptionId },
            data: {
              ...providerData(
                input.providerSubscription,
                input.subscriptionStatus,
                input.subscriptionStatus === "CANCELED"
                  ? input.processedAt
                  : null,
              ),
              openSubscriptionUserKey:
                input.subscriptionStatus === "CANCELED" ||
                input.subscriptionStatus === "EXPIRED"
                  ? null
                  : subscription.userId,
            },
          });
        }

        if (input.subscriptionId && input.payment) {
          const identifiers = [
            input.payment.authorizedPaymentId
              ? {
                  providerAuthorizedPaymentId:
                    input.payment.authorizedPaymentId,
                }
              : null,
            input.payment.paymentId
              ? { providerPaymentId: input.payment.paymentId }
              : null,
          ].filter(
            (value): value is NonNullable<typeof value> => value !== null,
          );
          const existing = identifiers.length
            ? await transaction.subscriptionPayment.findFirst({
                where: { OR: identifiers },
                select: { id: true },
              })
            : null;
          const paymentData = {
            subscriptionId: input.subscriptionId,
            providerAuthorizedPaymentId: input.payment.authorizedPaymentId,
            providerPaymentId: input.payment.paymentId,
            amount: input.payment.amount,
            currency: input.payment.currency,
            status: input.payment.status,
            paidAt: input.payment.paidAt,
            providerCreatedAt: input.payment.createdAt,
          };
          if (existing) {
            await transaction.subscriptionPayment.update({
              where: { id: existing.id },
              data: paymentData,
            });
          } else {
            await transaction.subscriptionPayment.create({ data: paymentData });
          }
        }
        return "processed" as const;
      });
    } catch (error) {
      if (isUniqueError(error)) {
        const event = await getPrisma().subscriptionEvent.findUnique({
          where: { providerEventId: input.providerEventId },
          select: { id: true },
        });
        if (event) return "duplicate";
      }
      throw error;
    }
  },
  async recordLocalEvent(input) {
    await getPrisma().subscriptionEvent.create({
      data: {
        subscriptionId: input.subscriptionId,
        providerEventId: input.providerEventId,
        eventType: input.eventType,
        payloadMetadata: input.metadata,
        processedAt: input.processedAt,
      },
    });
  },
  async hasOperationalSubscription(userId, now) {
    return Boolean(
      await getPrisma().subscription.findFirst({
        where: {
          userId,
          status: { in: ["TRIAL", "ACTIVE"] },
          currentPeriodEnd: { gt: now },
        },
        select: { id: true },
      }),
    );
  },
  async updatePlan(adminUserId, planId, input, now) {
    return getPrisma().$transaction(async (transaction) => {
      const current = await transaction.subscriptionPlan.findUnique({
        where: { id: planId },
        select: planSelect,
      });
      if (!current) return null;
      const updated = await transaction.subscriptionPlan.update({
        where: { id: planId },
        data: input,
        select: planSelect,
      });
      await transaction.adminAction.create({
        data: {
          adminUserId,
          actionType: "SUBSCRIPTION_PLAN_CHANGED",
          reason: "Configuracao do plano de assinatura alterada.",
          metadata: {
            planId,
            role: current.role,
            previousMonthlyPrice: current.monthlyPrice.toNumber(),
            newMonthlyPrice: input.monthlyPrice,
            active: input.active,
            trialDays: input.trialDays,
          },
          createdAt: now,
        },
      });
      return toPlan(updated);
    });
  },
};
