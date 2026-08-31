import { randomBytes } from "node:crypto";

import { hashPassword, verifyPassword } from "@/server/auth/password";
import {
  decryptPrivateField,
  encryptPrivateField,
  fingerprintPrivateField,
} from "@/server/security/private-fields";

import {
  AccountActiveDeliveryError,
  AccountPasswordInvalidError,
} from "./errors";
import {
  changePasswordSchema,
  closeAccountSchema,
  exportAccountSchema,
  updateAccountSchema,
} from "./schemas";
import type {
  AccountActor,
  AccountCredentials,
  AccountExportRecord,
  AccountOverview,
  ClosureAnonymization,
} from "./types";

export interface AccountRepository {
  getOverview(userId: string): Promise<AccountOverview | null>;
  updateOverview(
    userId: string,
    role: AccountActor["role"],
    input: ReturnType<typeof updateAccountSchema.parse>,
  ): Promise<AccountOverview>;
  getCredentials(userId: string): Promise<AccountCredentials | null>;
  changePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string,
    now: Date,
  ): Promise<void>;
  getExportRecord(
    userId: string,
    role: AccountActor["role"],
  ): Promise<AccountExportRecord>;
  hasBlockingDelivery(
    userId: string,
    role: AccountActor["role"],
  ): Promise<boolean>;
  closeAndAnonymize(
    userId: string,
    role: AccountActor["role"],
    anonymization: ClosureAnonymization,
    now: Date,
  ): Promise<void>;
}

async function requireCurrentPassword(
  actor: AccountActor,
  password: string,
  repository: AccountRepository,
) {
  const credentials = await repository.getCredentials(actor.userId);
  if (
    !credentials ||
    !(await verifyPassword(credentials.passwordHash, password))
  )
    throw new AccountPasswordInvalidError();
}

export async function getOwnAccount(
  actor: AccountActor,
  repository: AccountRepository,
) {
  const account = await repository.getOverview(actor.userId);
  if (!account) throw new AccountPasswordInvalidError();
  return account;
}

export async function updateOwnAccount(
  actor: AccountActor,
  input: unknown,
  repository: AccountRepository,
) {
  const data = updateAccountSchema.parse(input);
  await requireCurrentPassword(actor, data.currentPassword, repository);
  return repository.updateOverview(actor.userId, actor.role, data);
}

export async function changeOwnPassword(
  actor: AccountActor,
  input: unknown,
  repository: AccountRepository,
  now = new Date(),
) {
  const data = changePasswordSchema.parse(input);
  await requireCurrentPassword(actor, data.currentPassword, repository);
  const passwordHash = await hashPassword(data.newPassword);
  await repository.changePasswordAndRevokeSessions(
    actor.userId,
    passwordHash,
    now,
  );
}

export async function exportOwnData(
  actor: AccountActor,
  input: unknown,
  repository: AccountRepository,
  encryptionKey: string,
  now = new Date(),
) {
  const data = exportAccountSchema.parse(input);
  await requireCurrentPassword(actor, data.currentPassword, repository);
  const record = await repository.getExportRecord(actor.userId, actor.role);
  return {
    exportVersion: "1.0",
    generatedAt: now.toISOString(),
    account: {
      ...record.account,
      createdAt: record.account.createdAt.toISOString(),
      updatedAt: record.account.updatedAt.toISOString(),
    },
    profile: record.motoboyProfile
      ? {
          type: "MOTOBOY",
          cpf: decryptPrivateField(
            record.motoboyProfile.cpfEncrypted,
            encryptionKey,
          ),
          rg: decryptPrivateField(
            record.motoboyProfile.rgEncrypted,
            encryptionKey,
          ),
          birthDate: record.motoboyProfile.birthDate.toISOString().slice(0, 10),
          city: record.motoboyProfile.city,
          vehiclePlate: record.motoboyProfile.vehiclePlate,
          presence: {
            isOnline: record.motoboyProfile.isOnline,
            onlineSince:
              record.motoboyProfile.onlineSince?.toISOString() ?? null,
            lastLocationAt:
              record.motoboyProfile.lastLocationAt?.toISOString() ?? null,
            lastKnownLocation:
              record.motoboyProfile.lastLatitude === null
                ? null
                : {
                    latitude: record.motoboyProfile.lastLatitude,
                    longitude: record.motoboyProfile.lastLongitude,
                  },
          },
        }
      : record.companyProfile
        ? {
            type: "COMPANY",
            fantasyName: record.companyProfile.fantasyName,
            documentType: record.companyProfile.documentType,
            legalDocument: decryptPrivateField(
              record.companyProfile.legalDocumentEncrypted,
              encryptionKey,
            ),
            city: record.companyProfile.city,
            locations: record.companyProfile.locations,
          }
        : null,
    deliveries: record.deliveries,
    ratingsGiven: record.ratingsGiven,
    ratingsReceived: record.ratingsReceived,
    favorites: record.favorites,
    reportsCreated: record.reportsCreated,
    reportsReceivedCount: record.reportsReceivedCount,
    legalAcceptances: record.legalAcceptances,
  };
}

export async function closeOwnAccount(
  actor: AccountActor,
  input: unknown,
  repository: AccountRepository,
  encryptionKey: string,
  now = new Date(),
) {
  const data = closeAccountSchema.parse(input);
  await requireCurrentPassword(actor, data.currentPassword, repository);
  if (await repository.hasBlockingDelivery(actor.userId, actor.role))
    throw new AccountActiveDeliveryError();
  const marker = `closed:${actor.userId}:${now.toISOString()}:${randomBytes(8).toString("hex")}`;
  await repository.closeAndAnonymize(
    actor.userId,
    actor.role,
    {
      name: "Conta encerrada",
      email: `closed-${actor.userId}@account.invalid`,
      phone: `closed-${actor.userId.replaceAll("-", "").slice(0, 13)}`,
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      protectedMarker: encryptPrivateField(marker, encryptionKey),
      protectedFingerprint: fingerprintPrivateField(marker, encryptionKey),
    },
    now,
  );
}
