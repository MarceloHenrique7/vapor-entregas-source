import "server-only";

import { parse } from "csv-parse/sync";
import { Prisma } from "@/generated/prisma/client";

import { normalizeBrazilPhone } from "@/lib/validators/phone";
import { getSensitiveDataEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import {
  decryptPrivateField,
  encryptPrivateField,
  fingerprintPrivateField,
} from "@/server/security/private-fields";

import {
  ImportedOrderNotFoundError,
  IntegrationNotFoundError,
  IntegrationProfileRequiredError,
  IntegrationSignatureError,
} from "./errors";
import { genericWebhookAdapter, ifoodAdapterStatus } from "./providers";
import { csvImportSchema, genericWebhookOrderSchema } from "./schemas";
import {
  createWebhookCredential,
  hashIntegrationPayload,
  verifyWebhookSignature,
} from "./security";
import type { NormalizedImportedOrder } from "./types";

async function getCompany(userId: string) {
  const company = await getPrisma().companyProfile.findUnique({
    where: { userId },
    select: { id: true, fantasyName: true },
  });
  if (!company) throw new IntegrationProfileRequiredError();
  return company;
}

export async function listCompanyIntegrations(userId: string) {
  const company = await getCompany(userId);
  const connections = await getPrisma().integrationConnection.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      provider: true,
      status: true,
      displayName: true,
      keyPrefix: true,
      connectedAt: true,
      revokedAt: true,
    },
  });
  const generic = connections.find(
    (item) => item.provider === "GENERIC_WEBHOOK",
  );
  return {
    companyName: company.fantasyName,
    connectors: [
      {
        code: "GENERIC_WEBHOOK" as const,
        label: "Webhook parceiro",
        status: generic?.status ?? "NOT_CONNECTED",
        keyPrefix: generic?.keyPrefix ?? null,
        webhookPath: generic?.keyPrefix
          ? `/api/integrations/webhooks/${generic.keyPrefix}`
          : null,
        connectedAt: generic?.connectedAt?.toISOString() ?? null,
        message:
          "Para cardápios ou PDVs com webhook documentado. A assinatura HMAC é obrigatória.",
      },
      {
        code: "MANUAL_CSV" as const,
        label: "Importação CSV",
        status: "CONNECTED" as const,
        keyPrefix: null,
        webhookPath: null,
        connectedAt: null,
        message:
          "Importe, revise e confirme pedidos sem criar corridas automaticamente.",
      },
      {
        ...ifoodAdapterStatus,
        keyPrefix: null,
        webhookPath: null,
        connectedAt: null,
      },
    ],
  };
}

export async function rotateGenericWebhook(userId: string, now = new Date()) {
  const company = await getCompany(userId);
  const { keyPrefix, secret } = createWebhookCredential();
  const key = getSensitiveDataEnv().FIELD_ENCRYPTION_KEY;
  const connection = await getPrisma().integrationConnection.upsert({
    where: {
      companyId_provider: {
        companyId: company.id,
        provider: "GENERIC_WEBHOOK",
      },
    },
    create: {
      companyId: company.id,
      provider: "GENERIC_WEBHOOK",
      status: "CONNECTED",
      displayName: "Webhook parceiro",
      keyPrefix,
      secretEncrypted: encryptPrivateField(secret, key),
      secretHash: fingerprintPrivateField(secret, key),
      connectedAt: now,
    },
    update: {
      status: "CONNECTED",
      keyPrefix,
      secretEncrypted: encryptPrivateField(secret, key),
      secretHash: fingerprintPrivateField(secret, key),
      connectedAt: now,
      revokedAt: null,
    },
    select: { keyPrefix: true },
  });
  return {
    keyPrefix: connection.keyPrefix!,
    secret,
    webhookPath: `/api/integrations/webhooks/${connection.keyPrefix}`,
    warning: "Copie o segredo agora. Ele não será exibido novamente.",
  };
}

export async function revokeGenericWebhook(userId: string, now = new Date()) {
  const company = await getCompany(userId);
  const result = await getPrisma().integrationConnection.updateMany({
    where: { companyId: company.id, provider: "GENERIC_WEBHOOK" },
    data: {
      status: "REVOKED",
      revokedAt: now,
      keyPrefix: null,
      secretEncrypted: null,
      secretHash: null,
    },
  });
  if (!result.count) throw new IntegrationNotFoundError();
}

function orderData(order: NormalizedImportedOrder, encryptionKey: string) {
  const complete = Boolean(
    order.eligibleForOwnDelivery &&
    order.destinationAddress &&
    order.destinationNumber &&
    order.destinationNeighborhood &&
    order.destinationCity &&
    order.destinationState,
  );
  return {
    channel: order.channel,
    externalStatus: order.externalStatus,
    externalCreatedAt: order.externalCreatedAt,
    lastEventAt: order.lastEventAt,
    logisticsMode: order.logisticsMode,
    eligibleForOwnDelivery: order.eligibleForOwnDelivery,
    destinationAddress: order.destinationAddress,
    destinationNumber: order.destinationNumber,
    destinationNeighborhood: order.destinationNeighborhood,
    destinationComplement: order.destinationComplement,
    destinationReference: order.destinationReference,
    destinationPhoneEncrypted: order.destinationPhone
      ? encryptPrivateField(order.destinationPhone, encryptionKey)
      : null,
    destinationCity: order.destinationCity,
    destinationState: order.destinationState,
    destinationPostalCode: order.destinationPostalCode,
    notes: order.notes,
    status: complete ? ("READY" as const) : ("IMPORTED" as const),
    metadata: order.metadata,
  };
}

export async function ingestGenericWebhook(input: {
  keyPrefix: string;
  body: string;
  timestamp: string | null;
  signature: string | null;
  eventId: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (!input.timestamp || !input.signature || !input.eventId)
    throw new IntegrationSignatureError();
  const connection = await getPrisma().integrationConnection.findFirst({
    where: {
      keyPrefix: input.keyPrefix,
      provider: "GENERIC_WEBHOOK",
      status: "CONNECTED",
      revokedAt: null,
    },
    select: { id: true, companyId: true, secretEncrypted: true },
  });
  if (!connection?.secretEncrypted) throw new IntegrationNotFoundError();
  const encryptionKey = getSensitiveDataEnv().FIELD_ENCRYPTION_KEY;
  const secret = decryptPrivateField(connection.secretEncrypted, encryptionKey);
  if (
    !verifyWebhookSignature({
      secret,
      timestamp: input.timestamp,
      body: input.body,
      signature: input.signature,
      now,
    })
  )
    throw new IntegrationSignatureError();

  const raw = JSON.parse(input.body) as unknown;
  const validated = genericWebhookOrderSchema.parse(raw);
  const normalized = genericWebhookAdapter.normalize(validated);
  const eventTime = normalized.lastEventAt ?? now;
  const payloadHash = hashIntegrationPayload(input.body);
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const event = await transaction.integrationEvent.create({
        data: {
          connectionId: connection.id,
          externalEventId: input.eventId!,
          eventType: validated.eventType,
          occurredAt: eventTime,
          payloadHash,
        },
        select: { id: true },
      });
      const existing = await transaction.importedOrder.findUnique({
        where: {
          companyId_provider_externalId: {
            companyId: connection.companyId,
            provider: "GENERIC_WEBHOOK",
            externalId: normalized.externalId,
          },
        },
        select: { id: true, lastEventAt: true, deliveryId: true },
      });
      if (existing?.lastEventAt && existing.lastEventAt > eventTime) {
        await transaction.integrationEvent.update({
          where: { id: event.id },
          data: { status: "REJECTED", errorCode: "OUT_OF_ORDER" },
        });
        return { kind: "out_of_order" as const, orderId: existing.id };
      }
      const data = orderData(normalized, encryptionKey);
      const order = existing
        ? await transaction.importedOrder.update({
            where: { id: existing.id },
            data: existing.deliveryId
              ? {
                  lastEventAt: eventTime,
                  externalStatus: normalized.externalStatus,
                }
              : data,
            select: { id: true, status: true },
          })
        : await transaction.importedOrder.create({
            data: {
              companyId: connection.companyId,
              connectionId: connection.id,
              provider: "GENERIC_WEBHOOK",
              externalId: normalized.externalId,
              ...data,
            },
            select: { id: true, status: true },
          });
      await transaction.integrationEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSED" },
      });
      return {
        kind: "processed" as const,
        orderId: order.id,
        status: order.status,
      };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { kind: "duplicate" as const };
    }
    throw error;
  }
}

const cityMap: Record<string, "PETROLINA_PE" | "JUAZEIRO_BA"> = {
  PETROLINA: "PETROLINA_PE",
  "PETROLINA/PE": "PETROLINA_PE",
  PETROLINA_PE: "PETROLINA_PE",
  JUAZEIRO: "JUAZEIRO_BA",
  "JUAZEIRO/BA": "JUAZEIRO_BA",
  JUAZEIRO_BA: "JUAZEIRO_BA",
};

export interface CsvPreviewRow extends NormalizedImportedOrder {
  rowNumber: number;
  valid: boolean;
  errors: string[];
}

export function parseOrdersCsv(csv: string): CsvPreviewRow[] {
  const records = parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as Array<Record<string, string>>;
  if (records.length > 200)
    throw new Error("O arquivo deve ter no máximo 200 pedidos.");
  return records.map((record, index) => {
    const read = (name: string) => (record[name] ?? "").trim();
    const city = cityMap[read("cidade").toUpperCase()];
    const state = read("estado").toUpperCase();
    const phoneRaw = read("telefone");
    const phone = phoneRaw
      ? (normalizeBrazilPhone(phoneRaw) ?? undefined)
      : undefined;
    const errors: string[] = [];
    if (!read("external_id")) errors.push("external_id é obrigatório");
    if (!read("rua")) errors.push("rua é obrigatória");
    if (!read("numero")) errors.push("numero é obrigatório");
    if (!read("bairro")) errors.push("bairro é obrigatório");
    if (!city) errors.push("cidade deve ser Petrolina ou Juazeiro");
    if (
      city &&
      state &&
      !(
        (city === "PETROLINA_PE" && state === "PE") ||
        (city === "JUAZEIRO_BA" && state === "BA")
      )
    )
      errors.push("estado não corresponde à cidade");
    if (phoneRaw && !phone) errors.push("telefone inválido");
    const postalCode = read("cep").replace(/\D/g, "");
    if (postalCode && postalCode.length !== 8) errors.push("CEP inválido");
    return {
      rowNumber: index + 2,
      valid: errors.length === 0,
      errors,
      externalId: read("external_id"),
      channel: read("canal") || "Importação CSV",
      logisticsMode: "MERCHANT",
      eligibleForOwnDelivery: true,
      destinationAddress: read("rua") || undefined,
      destinationNumber: read("numero") || undefined,
      destinationNeighborhood: read("bairro") || undefined,
      destinationComplement: read("complemento") || undefined,
      destinationReference: read("referencia") || undefined,
      destinationPhone: phone,
      destinationCity: city,
      destinationState:
        city === "PETROLINA_PE"
          ? "PE"
          : city === "JUAZEIRO_BA"
            ? "BA"
            : undefined,
      destinationPostalCode: postalCode || undefined,
      notes: read("observacao").slice(0, 500) || undefined,
    };
  });
}

export async function importOrdersCsv(
  userId: string,
  raw: unknown,
  now = new Date(),
) {
  const input = csvImportSchema.parse(raw);
  const rows = parseOrdersCsv(input.csv);
  if (!input.confirm) return { confirmed: false, rows };
  if (rows.some((row) => !row.valid))
    return {
      confirmed: false,
      rows,
      error: "Corrija as linhas inválidas antes de confirmar.",
    };
  const company = await getCompany(userId);
  const encryptionKey = getSensitiveDataEnv().FIELD_ENCRYPTION_KEY;
  const result = await getPrisma().$transaction(async (transaction) => {
    const connection = await transaction.integrationConnection.upsert({
      where: {
        companyId_provider: { companyId: company.id, provider: "MANUAL_CSV" },
      },
      create: {
        companyId: company.id,
        provider: "MANUAL_CSV",
        status: "CONNECTED",
        displayName: "Importação CSV",
        connectedAt: now,
      },
      update: { status: "CONNECTED", revokedAt: null },
      select: { id: true },
    });
    let created = 0;
    let duplicates = 0;
    for (const row of rows) {
      const existing = await transaction.importedOrder.findUnique({
        where: {
          companyId_provider_externalId: {
            companyId: company.id,
            provider: "MANUAL_CSV",
            externalId: row.externalId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        duplicates += 1;
        continue;
      }
      await transaction.importedOrder.create({
        data: {
          companyId: company.id,
          connectionId: connection.id,
          provider: "MANUAL_CSV",
          externalId: row.externalId,
          ...orderData(row, encryptionKey),
          lastEventAt: now,
        },
      });
      created += 1;
    }
    return { created, duplicates };
  });
  return { confirmed: true, rows, ...result };
}

export async function listImportedOrders(userId: string) {
  const company = await getCompany(userId);
  return getPrisma()
    .importedOrder.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        provider: true,
        externalId: true,
        channel: true,
        externalStatus: true,
        eligibleForOwnDelivery: true,
        destinationAddress: true,
        destinationNumber: true,
        destinationNeighborhood: true,
        destinationCity: true,
        status: true,
        deliveryId: true,
        createdAt: true,
      },
    })
    .then((rows) =>
      rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    );
}

export async function getImportedOrderDraft(userId: string, orderId: string) {
  const company = await getCompany(userId);
  const row = await getPrisma().importedOrder.findFirst({
    where: {
      id: orderId,
      companyId: company.id,
      eligibleForOwnDelivery: true,
      status: "READY",
      deliveryId: null,
    },
    select: {
      id: true,
      destinationAddress: true,
      destinationNumber: true,
      destinationNeighborhood: true,
      destinationComplement: true,
      destinationReference: true,
      destinationPhoneEncrypted: true,
      destinationCity: true,
      destinationState: true,
      destinationPostalCode: true,
      notes: true,
      channel: true,
    },
  });
  if (!row) throw new ImportedOrderNotFoundError();
  return {
    ...row,
    destinationPhone: row.destinationPhoneEncrypted
      ? decryptPrivateField(
          row.destinationPhoneEncrypted,
          getSensitiveDataEnv().FIELD_ENCRYPTION_KEY,
        )
      : null,
    destinationPhoneEncrypted: undefined,
  };
}
