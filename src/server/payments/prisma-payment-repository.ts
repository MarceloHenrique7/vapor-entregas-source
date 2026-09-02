import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import { calculateAccessPeriod } from "./access-period";

import type {
  PaymentAttemptRecord,
  PaymentAttemptStatus,
  PaymentRepository,
  ProviderOneOffPayment,
} from "./types";

const attemptSelect = {
  id: true,
  subscriptionId: true,
  userId: true,
  planId: true,
  providerPaymentId: true,
  externalReference: true,
  idempotencyKey: true,
  amount: true,
  currency: true,
  status: true,
  providerStatusDetail: true,
  paymentMethod: true,
  paidAt: true,
  expiresAt: true,
  accessGrantedAt: true,
  providerCreatedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function internalStatus(value: string): PaymentAttemptStatus {
  const normalized = value.toUpperCase();
  if (
    [
      "CREATED",
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
      "REFUNDED",
      "EXPIRED",
      "ERROR",
    ].includes(normalized)
  ) {
    return normalized as PaymentAttemptStatus;
  }
  return "ERROR";
}

function toAttempt(value: {
  id: string;
  subscriptionId: string;
  userId: string | null;
  planId: string | null;
  providerPaymentId: string | null;
  externalReference: string | null;
  idempotencyKey: string | null;
  amount: { toNumber(): number };
  currency: string;
  status: string;
  providerStatusDetail: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  accessGrantedAt: Date | null;
  providerCreatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentAttemptRecord {
  return {
    ...value,
    amount: value.amount.toNumber(),
    status: internalStatus(value.status),
  };
}

function providerData(
  payment: ProviderOneOffPayment,
  status: PaymentAttemptStatus,
) {
  return {
    providerPaymentId: payment.id,
    status,
    providerStatusDetail: payment.statusDetail,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt,
    expiresAt: payment.expiresAt,
    providerCreatedAt: payment.createdAt,
    safeMetadata: {
      providerStatus: payment.status,
      hasPix: payment.pix !== null,
    },
  };
}

function isUniqueError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const prismaPaymentRepository: PaymentRepository = {
  async createAttempt(input) {
    const existing = await getPrisma().subscriptionPayment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: attemptSelect,
    });
    if (existing) {
      if (
        existing.userId !== input.userId ||
        existing.planId !== input.planId
      ) {
        throw new Error("PAYMENT_IDEMPOTENCY_OWNERSHIP_MISMATCH");
      }
      return { attempt: toAttempt(existing), reused: true };
    }
    try {
      const created = await getPrisma().subscriptionPayment.create({
        data: {
          id: input.id,
          subscriptionId: input.subscription.id,
          userId: input.userId,
          planId: input.planId,
          externalReference: input.externalReference,
          idempotencyKey: input.idempotencyKey,
          amount: input.amount,
          currency: "BRL",
          status: "CREATED",
          createdAt: input.now,
        },
        select: attemptSelect,
      });
      return { attempt: toAttempt(created), reused: false };
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      const concurrent = await getPrisma().subscriptionPayment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: attemptSelect,
      });
      if (
        !concurrent ||
        concurrent.userId !== input.userId ||
        concurrent.planId !== input.planId
      ) {
        throw error;
      }
      return { attempt: toAttempt(concurrent), reused: true };
    }
  },

  async findAttemptByProviderId(id) {
    const value = await getPrisma().subscriptionPayment.findUnique({
      where: { providerPaymentId: id },
      select: attemptSelect,
    });
    return value ? toAttempt(value) : null;
  },

  async findAttemptById(id) {
    const value = await getPrisma().subscriptionPayment.findUnique({
      where: { id },
      select: attemptSelect,
    });
    return value ? toAttempt(value) : null;
  },

  async findAttemptByExternalReference(externalReference) {
    const value = await getPrisma().subscriptionPayment.findUnique({
      where: { externalReference },
      select: attemptSelect,
    });
    return value ? toAttempt(value) : null;
  },

  async attachProviderPayment(attemptId, payment, status) {
    return toAttempt(
      await getPrisma().subscriptionPayment.update({
        where: { id: attemptId },
        data: providerData(payment, status),
        select: attemptSelect,
      }),
    );
  },

  async markAttemptError(attemptId) {
    await getPrisma().subscriptionPayment.updateMany({
      where: { id: attemptId, providerPaymentId: null },
      data: { status: "ERROR" },
    });
  },

  async applyConfirmedPayment(input) {
    try {
      return await getPrisma().$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
            SELECT id
            FROM subscription_payments
            WHERE id = ${input.attemptId}
            FOR UPDATE
          `;
          const attempt =
            await transaction.subscriptionPayment.findUniqueOrThrow({
              where: { id: input.attemptId },
              select: attemptSelect,
            });
          await transaction.subscriptionEvent.create({
            data: {
              subscriptionId: attempt.subscriptionId,
              providerEventId: input.eventId,
              eventType: input.eventType,
              payloadMetadata: {
                paymentIdPresent: true,
                oldStatus: attempt.status,
                newStatus: input.status,
                accessAlreadyGranted: attempt.accessGrantedAt !== null,
              },
              processedAt: input.processedAt,
            },
          });
          await transaction.subscriptionPayment.update({
            where: { id: input.attemptId },
            data: providerData(input.payment, input.status),
          });
          if (input.status !== "APPROVED" || attempt.accessGrantedAt) {
            return "processed" as const;
          }

          await transaction.$queryRaw`
            SELECT id
            FROM subscriptions
            WHERE id = ${attempt.subscriptionId}
            FOR UPDATE
          `;
          const subscription = await transaction.subscription.findUniqueOrThrow(
            {
              where: { id: attempt.subscriptionId },
              select: {
                userId: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
              },
            },
          );
          const approvedAt = input.payment.paidAt ?? input.processedAt;
          const accessPeriod = calculateAccessPeriod(
            subscription.currentPeriodStart,
            subscription.currentPeriodEnd,
            approvedAt,
          );
          await transaction.subscription.update({
            where: { id: attempt.subscriptionId },
            data: {
              status: "ACTIVE",
              providerStatus: input.payment.status,
              currentPeriodStart: accessPeriod.startsAt,
              currentPeriodEnd: accessPeriod.expiresAt,
              nextPaymentAt: null,
              canceledAt: null,
              openSubscriptionUserKey: subscription.userId,
            },
          });
          await transaction.subscriptionPayment.update({
            where: { id: input.attemptId },
            data: { accessGrantedAt: input.processedAt },
          });
          return "access_granted" as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueError(error)) {
        const event = await getPrisma().subscriptionEvent.findUnique({
          where: { providerEventId: input.eventId },
          select: { id: true },
        });
        if (event) return "duplicate";
      }
      throw error;
    }
  },
};
