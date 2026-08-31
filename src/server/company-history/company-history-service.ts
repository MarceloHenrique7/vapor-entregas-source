import "server-only";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import type { Role } from "@/server/auth/types";

import {
  companyHistoryIdSchema,
  companyHistoryQuerySchema,
  companyMotoboysQuerySchema,
  companyRelationQuerySchema,
} from "./schemas";

export interface CompanyHistoryActor {
  userId: string;
  role: Role;
}

export interface CompanyHistoryRepository {
  listHistory(
    userId: string,
    query: ReturnType<typeof companyHistoryQuerySchema.parse>,
  ): Promise<unknown>;
  getHistoryDetail(userId: string, deliveryId: string): Promise<unknown | null>;
  getRepeatDraft(userId: string, deliveryId: string): Promise<unknown | null>;
  listMotoboys(
    userId: string,
    query: ReturnType<typeof companyMotoboysQuerySchema.parse>,
    now: Date,
    ttlMinutes: number,
  ): Promise<unknown>;
  getMotoboyRelationship(
    userId: string,
    motoboyId: string,
    query: ReturnType<typeof companyRelationQuerySchema.parse>,
  ): Promise<unknown | null>;
}

function requireCompany(actor: CompanyHistoryActor | null) {
  if (!actor) throw new UnauthenticatedError();
  if (actor.role !== "COMPANY") throw new ForbiddenError();
  return actor;
}

export function parseSearchParams(search: URLSearchParams) {
  return Object.fromEntries(search.entries());
}

export async function listCompanyHistory(
  actor: CompanyHistoryActor | null,
  input: unknown,
  repository: CompanyHistoryRepository,
) {
  const company = requireCompany(actor);
  return repository.listHistory(
    company.userId,
    companyHistoryQuerySchema.parse(input),
  );
}

export async function getCompanyHistoryDetail(
  actor: CompanyHistoryActor | null,
  rawId: unknown,
  repository: CompanyHistoryRepository,
) {
  const company = requireCompany(actor);
  return repository.getHistoryDetail(
    company.userId,
    companyHistoryIdSchema.parse(rawId),
  );
}

export async function getCompanyRepeatDraft(
  actor: CompanyHistoryActor | null,
  rawId: unknown,
  repository: CompanyHistoryRepository,
) {
  const company = requireCompany(actor);
  return repository.getRepeatDraft(
    company.userId,
    companyHistoryIdSchema.parse(rawId),
  );
}

export async function listCompanyMotoboys(
  actor: CompanyHistoryActor | null,
  input: unknown,
  repository: CompanyHistoryRepository,
  now: Date,
  ttlMinutes: number,
) {
  const company = requireCompany(actor);
  return repository.listMotoboys(
    company.userId,
    companyMotoboysQuerySchema.parse(input),
    now,
    ttlMinutes,
  );
}

export async function getCompanyMotoboyRelationship(
  actor: CompanyHistoryActor | null,
  rawId: unknown,
  input: unknown,
  repository: CompanyHistoryRepository,
) {
  const company = requireCompany(actor);
  const motoboyId = companyHistoryIdSchema.parse(rawId);
  return repository.getMotoboyRelationship(
    company.userId,
    motoboyId,
    companyRelationQuerySchema.parse(input),
  );
}
