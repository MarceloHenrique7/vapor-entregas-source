import "server-only";

import { getPrisma } from "@/server/db/prisma";

import type { LocationRepository } from "./location-service";

const locationSelect = {
  id: true,
  companyId: true,
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
} as const;

function toRecord(location: {
  id: string;
  companyId: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  reference: string | null;
  city: "PETROLINA_PE" | "JUAZEIRO_BA";
  state: string;
  postalCode: string | null;
  latitude: { toNumber(): number } | null;
  longitude: { toNumber(): number } | null;
  isDefault: boolean;
}) {
  if (!location.latitude || !location.longitude) return null;
  return {
    ...location,
    state: location.state as "PE" | "BA",
    complement: location.complement ?? undefined,
    reference: location.reference ?? undefined,
    postalCode: location.postalCode ?? undefined,
    latitude: location.latitude.toNumber(),
    longitude: location.longitude.toNumber(),
  };
}

export const prismaLocationRepository: LocationRepository = {
  async getCompanyIdForUser(userId) {
    const profile = await getPrisma().companyProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  },
  async getLocationOwnership(locationId) {
    const location = await getPrisma().companyLocation.findUnique({
      where: { id: locationId },
      select: { companyId: true, company: { select: { userId: true } } },
    });
    return location
      ? { companyId: location.companyId, userId: location.company.userId }
      : null;
  },
  async saveDefault(companyId, input) {
    const prisma = getPrisma();
    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.companyLocation.findFirst({
        where: { companyId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      await transaction.companyLocation.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false, defaultCompanyKey: null },
      });
      const data = {
        ...input,
        postalCode: input.postalCode,
        isDefault: true,
        defaultCompanyKey: companyId,
      };
      return existing
        ? transaction.companyLocation.update({
            where: { id: existing.id },
            data,
            select: locationSelect,
          })
        : transaction.companyLocation.create({
            data: { ...data, companyId },
            select: locationSelect,
          });
    });
    const record = toRecord(result);
    if (!record) throw new Error("A localização salva não possui coordenadas.");
    return record;
  },
  async update(locationId, input) {
    const location = await getPrisma().companyLocation.update({
      where: { id: locationId },
      data: input,
      select: locationSelect,
    });
    const record = toRecord(location);
    if (!record)
      throw new Error("A localização atualizada não possui coordenadas.");
    return record;
  },
  async getDefault(companyId) {
    const location = await getPrisma().companyLocation.findFirst({
      where: {
        companyId,
        isDefault: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: locationSelect,
    });
    return location ? toRecord(location) : null;
  },
};
