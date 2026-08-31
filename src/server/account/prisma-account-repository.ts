import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

import { AccountConflictError } from "./errors";
import type { AccountRepository } from "./account-service";

const prisma = getPrisma();
const blockingStatuses = [
  "SEARCHING_MOTOBOY",
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
  "DISPUTED",
] as const;

function overviewFromUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "MOTOBOY" | "COMPANY" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BLOCKED" | "DELETED";
  createdAt: Date;
  motoboyProfile: null | {
    city: string;
    cpfLastDigits: string;
    birthDate: Date;
    vehiclePlate: string | null;
  };
  companyProfile: null | {
    city: string;
    fantasyName: string;
    legalDocumentLastDigits: string;
  };
  legalAcceptances: Array<{
    documentType: "TERMS_OF_USE" | "PRIVACY_POLICY";
    documentVersion: string;
    acceptedAt: Date;
  }>;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    city: user.motoboyProfile?.city ?? user.companyProfile?.city ?? null,
    fantasyName: user.companyProfile?.fantasyName ?? null,
    documentMasked: user.motoboyProfile
      ? `CPF final ${user.motoboyProfile.cpfLastDigits}`
      : user.companyProfile
        ? `CPF/CNPJ final ${user.companyProfile.legalDocumentLastDigits}`
        : null,
    birthDate:
      user.motoboyProfile?.birthDate.toISOString().slice(0, 10) ?? null,
    vehiclePlate: user.motoboyProfile?.vehiclePlate ?? null,
    legalAcceptances: user.legalAcceptances.map((item) => ({
      ...item,
      acceptedAt: item.acceptedAt.toISOString(),
    })),
  };
}

const overviewSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  motoboyProfile: {
    select: {
      city: true,
      cpfLastDigits: true,
      birthDate: true,
      vehiclePlate: true,
    },
  },
  companyProfile: {
    select: { city: true, fantasyName: true, legalDocumentLastDigits: true },
  },
  legalAcceptances: {
    orderBy: { acceptedAt: "desc" as const },
    select: { documentType: true, documentVersion: true, acceptedAt: true },
  },
} as const;

function handleConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    throw new AccountConflictError(
      "O telefone informado já está vinculado a outra conta.",
    );
  throw error;
}

export const prismaAccountRepository: AccountRepository = {
  async getOverview(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: overviewSelect,
    });
    return user ? overviewFromUser(user) : null;
  },

  async updateOverview(userId, role, input) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          phone: input.phone,
          ...(role === "COMPANY" && input.fantasyName
            ? { companyProfile: { update: { fantasyName: input.fantasyName } } }
            : {}),
          ...(role === "MOTOBOY" && input.vehiclePlate !== undefined
            ? {
                motoboyProfile: {
                  update: { vehiclePlate: input.vehiclePlate },
                },
              }
            : {}),
        },
      });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: overviewSelect,
      });
      return overviewFromUser(user);
    } catch (error) {
      return handleConflict(error);
    }
  },

  async getCredentials(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
  },

  async changePasswordAndRevokeSessions(userId, passwordHash, now) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  },

  async getExportRecord(userId, role) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        motoboyProfile: {
          select: {
            id: true,
            cpfEncrypted: true,
            rgEncrypted: true,
            birthDate: true,
            city: true,
            vehiclePlate: true,
            isOnline: true,
            onlineSince: true,
            lastLocationAt: true,
            lastLatitude: true,
            lastLongitude: true,
          },
        },
        companyProfile: {
          select: {
            id: true,
            fantasyName: true,
            documentType: true,
            legalDocumentEncrypted: true,
            city: true,
            locations: {
              select: {
                label: true,
                address: true,
                number: true,
                neighborhood: true,
                complement: true,
                reference: true,
                city: true,
                state: true,
                postalCode: true,
                latitude: true,
                longitude: true,
                isDefault: true,
              },
            },
          },
        },
        ratingsGiven: {
          orderBy: { createdAt: "desc" },
          select: {
            deliveryId: true,
            score: true,
            comment: true,
            createdAt: true,
          },
        },
        ratingsReceived: {
          orderBy: { createdAt: "desc" },
          select: {
            deliveryId: true,
            score: true,
            comment: true,
            createdAt: true,
          },
        },
        reportsCreated: {
          orderBy: { createdAt: "desc" },
          select: {
            deliveryId: true,
            category: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        legalAcceptances: {
          orderBy: { acceptedAt: "desc" },
          select: {
            documentType: true,
            documentVersion: true,
            acceptedAt: true,
          },
        },
        _count: { select: { reportsReceived: true } },
      },
    });
    const profileId =
      role === "COMPANY" ? user.companyProfile?.id : user.motoboyProfile?.id;
    const deliveries = profileId
      ? await prisma.delivery.findMany({
          where:
            role === "COMPANY"
              ? { companyId: profileId }
              : { motoboyId: profileId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            pickupNeighborhood: true,
            pickupCity: true,
            destinationNeighborhood: true,
            destinationCity: true,
            distanceEstimateKm: true,
            offeredPrice: true,
            paymentMethod: true,
            notes: true,
            acceptedAt: true,
            pickedUpAt: true,
            completedAt: true,
            cancelledAt: true,
            createdAt: true,
            extras: {
              orderBy: { createdAt: "asc" },
              select: {
                type: true,
                description: true,
                amount: true,
                informedByRole: true,
                status: true,
                note: true,
                createdAt: true,
                history: {
                  orderBy: { createdAt: "asc" },
                  select: {
                    previousStatus: true,
                    newStatus: true,
                    action: true,
                    actorRole: true,
                    note: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        })
      : [];
    const favorites = user.companyProfile
      ? await prisma.favorite.findMany({
          where: { companyId: user.companyProfile.id },
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            motoboy: { select: { user: { select: { name: true } } } },
          },
        })
      : [];
    return {
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      motoboyProfile: user.motoboyProfile
        ? {
            ...user.motoboyProfile,
            lastLatitude: user.motoboyProfile.lastLatitude?.toNumber() ?? null,
            lastLongitude:
              user.motoboyProfile.lastLongitude?.toNumber() ?? null,
          }
        : null,
      companyProfile: user.companyProfile
        ? {
            ...user.companyProfile,
            locations: user.companyProfile.locations.map((location) => ({
              ...location,
              latitude: location.latitude?.toNumber() ?? null,
              longitude: location.longitude?.toNumber() ?? null,
            })),
          }
        : null,
      deliveries: deliveries.map((delivery) => ({
        ...delivery,
        distanceEstimateKm: Number(delivery.distanceEstimateKm),
        offeredPrice: Number(delivery.offeredPrice),
        extras: delivery.extras.map((extra) => ({
          ...extra,
          amount: extra.amount === null ? null : Number(extra.amount),
        })),
      })),
      ratingsGiven: user.ratingsGiven,
      ratingsReceived: user.ratingsReceived,
      favorites: favorites.map((favorite) => ({
        motoboyName: favorite.motoboy.user.name,
        createdAt: favorite.createdAt,
      })),
      reportsCreated: user.reportsCreated,
      reportsReceivedCount: user._count.reportsReceived,
      legalAcceptances: user.legalAcceptances,
    };
  },

  async hasBlockingDelivery(userId, role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        motoboyProfile: { select: { id: true } },
        companyProfile: { select: { id: true } },
      },
    });
    const profileId =
      role === "COMPANY" ? user?.companyProfile?.id : user?.motoboyProfile?.id;
    if (!profileId) return false;
    return (
      (await prisma.delivery.count({
        where: {
          ...(role === "COMPANY"
            ? { companyId: profileId }
            : { motoboyId: profileId }),
          status: { in: [...blockingStatuses] },
        },
      })) > 0
    );
  },

  async closeAndAnonymize(userId, role, anonymization, now) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          motoboyProfile: { select: { id: true } },
          companyProfile: { select: { id: true } },
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: anonymization.name,
          email: anonymization.email,
          phone: anonymization.phone,
          passwordHash: anonymization.passwordHash,
          status: "DELETED",
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (role === "MOTOBOY" && user.motoboyProfile)
        await tx.motoboyProfile.update({
          where: { id: user.motoboyProfile.id },
          data: {
            cpfEncrypted: anonymization.protectedMarker,
            cpfHash: anonymization.protectedFingerprint,
            cpfLastDigits: "00",
            rgEncrypted: anonymization.protectedMarker,
            rgHash: anonymization.protectedFingerprint,
            birthDate: new Date("1970-01-01T00:00:00.000Z"),
            vehiclePlate: null,
            isOnline: false,
            onlineSince: null,
            lastLocationAt: null,
            lastLatitude: null,
            lastLongitude: null,
          },
        });
      if (role === "COMPANY" && user.companyProfile) {
        await tx.companyProfile.update({
          where: { id: user.companyProfile.id },
          data: {
            fantasyName: "Empresa encerrada",
            legalDocumentEncrypted: anonymization.protectedMarker,
            legalDocumentHash: anonymization.protectedFingerprint,
            legalDocumentLastDigits: "0000",
          },
        });
        await tx.companyLocation.updateMany({
          where: { companyId: user.companyProfile.id },
          data: {
            label: "Local removido",
            address: "Dados removidos",
            number: "-",
            neighborhood: "-",
            complement: null,
            reference: null,
            postalCode: null,
            latitude: null,
            longitude: null,
            isDefault: false,
            defaultCompanyKey: null,
          },
        });
      }
      await tx.accountClosure.create({
        data: {
          userId,
          requestedAt: now,
          processedAt: now,
          retainedData: {
            categories: [
              "DELIVERIES",
              "RATINGS",
              "REPORTS",
              "LEGAL_ACCEPTANCES",
              "SECURITY_AUDIT",
            ],
            policy: "RETENTION_REQUIRES_CONTEXTUAL_REVIEW",
          },
        },
      });
    });
  },
};
