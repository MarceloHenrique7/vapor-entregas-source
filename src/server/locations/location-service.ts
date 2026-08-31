import { ForbiddenError } from "@/server/auth/errors";

import { LocationNotFoundError } from "./errors";
import {
  saveCompanyLocationSchema,
  type SaveCompanyLocationInput,
} from "./schemas";
import type { CompanyLocationRecord, LocationActor } from "./types";

export interface LocationRepository {
  getCompanyIdForUser(userId: string): Promise<string | null>;
  getLocationOwnership(
    locationId: string,
  ): Promise<{ companyId: string; userId: string } | null>;
  saveDefault(
    companyId: string,
    input: SaveCompanyLocationInput,
  ): Promise<CompanyLocationRecord>;
  update(
    locationId: string,
    input: SaveCompanyLocationInput,
  ): Promise<CompanyLocationRecord>;
  getDefault(companyId: string): Promise<CompanyLocationRecord | null>;
}

async function resolveEditableCompanyId(
  actor: LocationActor,
  repository: LocationRepository,
  adminTargetCompanyId?: string,
) {
  if (actor.role === "ADMIN") {
    if (!adminTargetCompanyId)
      throw new LocationNotFoundError("Empresa não informada.");
    return adminTargetCompanyId;
  }
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  const companyId = await repository.getCompanyIdForUser(actor.userId);
  if (!companyId)
    throw new LocationNotFoundError("Perfil da empresa não encontrado.");
  return companyId;
}

export async function createOrReplaceDefaultCompanyLocation(
  actor: LocationActor,
  input: unknown,
  repository: LocationRepository,
  adminTargetCompanyId?: string,
) {
  const validated = saveCompanyLocationSchema.parse(input);
  const companyId = await resolveEditableCompanyId(
    actor,
    repository,
    adminTargetCompanyId,
  );
  return repository.saveDefault(companyId, validated);
}

export async function updateCompanyLocation(
  actor: LocationActor,
  locationId: string,
  input: unknown,
  repository: LocationRepository,
) {
  const validated = saveCompanyLocationSchema.parse(input);
  const ownership = await repository.getLocationOwnership(locationId);
  if (!ownership) throw new LocationNotFoundError();
  if (actor.role !== "ADMIN") {
    if (actor.role !== "COMPANY" || ownership.userId !== actor.userId) {
      throw new ForbiddenError();
    }
  }
  return repository.update(locationId, validated);
}

export async function getDefaultCompanyLocation(
  companyId: string,
  repository: LocationRepository,
) {
  return repository.getDefault(companyId);
}
