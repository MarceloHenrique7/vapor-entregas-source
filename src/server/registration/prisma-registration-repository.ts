import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import { RegistrationConflictError } from "./errors";
import type { RegistrationRepository } from "./register";

function handlePrismaRegistrationError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new RegistrationConflictError();
  }
  throw error;
}

export const prismaRegistrationRepository: RegistrationRepository = {
  async createMotoboy(data) {
    try {
      const id = randomUUID();
      const plan = await getPrisma().subscriptionPlan.findUnique({
        where: { role: "MOTOBOY" },
        select: { id: true, monthlyPrice: true, trialDays: true, active: true },
      });
      const trialEndsAt =
        plan?.active && plan.trialDays > 0
          ? new Date(data.registeredAt.getTime() + plan.trialDays * 86_400_000)
          : null;
      const user = await getPrisma().user.create({
        data: {
          id,
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: data.passwordHash,
          motoboyProfile: {
            create: {
              cpfEncrypted: data.profile.cpfEncrypted,
              cpfHash: data.profile.cpfHash,
              cpfLastDigits: data.profile.cpfLastDigits,
              rgEncrypted: data.profile.rgEncrypted,
              rgHash: data.profile.rgHash,
              birthDate: data.profile.birthDate,
              city: data.profile.city,
              vehiclePlate: data.profile.vehiclePlate,
              legalResponsibilityAcceptedAt: data.profile.acceptedAt,
              intermediationAcceptedAt: data.profile.acceptedAt,
            },
          },
          termsAcceptances: { create: { version: data.termsVersion } },
          privacyAcceptances: { create: { version: data.privacyVersion } },
          legalAcceptances: {
            create: [
              {
                documentType: "TERMS_OF_USE",
                documentVersion: data.termsVersion,
                metadata: { source: "REGISTRATION" },
              },
              {
                documentType: "PRIVACY_POLICY",
                documentVersion: data.privacyVersion,
                metadata: { source: "REGISTRATION" },
              },
            ],
          },
          ...(plan && trialEndsAt
            ? {
                subscriptions: {
                  create: {
                    openSubscriptionUserKey: id,
                    planId: plan.id,
                    status: "TRIAL" as const,
                    monthlyPrice: plan.monthlyPrice,
                    currentPeriodStart: data.registeredAt,
                    currentPeriodEnd: trialEndsAt,
                    trialGrantedAt: data.registeredAt,
                    trialEndsAt,
                    events: {
                      create: {
                        providerEventId: `local:trial:${id}:${data.registeredAt.toISOString()}`,
                        eventType: "trial.started",
                        processedAt: data.registeredAt,
                        payloadMetadata: { trialDays: plan.trialDays },
                      },
                    },
                  },
                },
              }
            : {}),
        },
        select: { id: true, name: true, email: true, role: true },
      });
      return user;
    } catch (error) {
      return handlePrismaRegistrationError(error);
    }
  },

  async createCompany(data) {
    try {
      const id = randomUUID();
      const plan = await getPrisma().subscriptionPlan.findUnique({
        where: { role: "COMPANY" },
        select: { id: true, monthlyPrice: true, trialDays: true, active: true },
      });
      const trialEndsAt =
        plan?.active && plan.trialDays > 0
          ? new Date(data.registeredAt.getTime() + plan.trialDays * 86_400_000)
          : null;
      const user = await getPrisma().user.create({
        data: {
          id,
          role: data.role,
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: data.passwordHash,
          companyProfile: {
            create: {
              fantasyName: data.profile.fantasyName,
              documentType: data.profile.documentType,
              legalDocumentEncrypted: data.profile.legalDocumentEncrypted,
              legalDocumentHash: data.profile.legalDocumentHash,
              legalDocumentLastDigits: data.profile.legalDocumentLastDigits,
              city: data.profile.city,
              locations: {
                create: {
                  label: "Loja principal",
                  address: data.profile.address,
                  number: data.profile.addressNumber,
                  neighborhood: data.profile.neighborhood,
                  complement: data.profile.complement,
                  reference: data.profile.referencePoint,
                  city: data.profile.city,
                  state: data.profile.city === "PETROLINA_PE" ? "PE" : "BA",
                  isDefault: false,
                },
              },
            },
          },
          termsAcceptances: { create: { version: data.termsVersion } },
          privacyAcceptances: { create: { version: data.privacyVersion } },
          legalAcceptances: {
            create: [
              {
                documentType: "TERMS_OF_USE",
                documentVersion: data.termsVersion,
                metadata: { source: "REGISTRATION" },
              },
              {
                documentType: "PRIVACY_POLICY",
                documentVersion: data.privacyVersion,
                metadata: { source: "REGISTRATION" },
              },
            ],
          },
          ...(plan && trialEndsAt
            ? {
                subscriptions: {
                  create: {
                    openSubscriptionUserKey: id,
                    planId: plan.id,
                    status: "TRIAL" as const,
                    monthlyPrice: plan.monthlyPrice,
                    currentPeriodStart: data.registeredAt,
                    currentPeriodEnd: trialEndsAt,
                    trialGrantedAt: data.registeredAt,
                    trialEndsAt,
                    events: {
                      create: {
                        providerEventId: `local:trial:${id}:${data.registeredAt.toISOString()}`,
                        eventType: "trial.started",
                        processedAt: data.registeredAt,
                        payloadMetadata: { trialDays: plan.trialDays },
                      },
                    },
                  },
                },
              }
            : {}),
        },
        select: { id: true, name: true, email: true, role: true },
      });
      return user;
    } catch (error) {
      return handlePrismaRegistrationError(error);
    }
  },
};
