import { assertAdminAccess } from "@/server/admin/policy";
import type { AdminActor } from "@/server/admin/types";

import {
  formatBrazilianPhone,
  preRegistrationAdminSearchSchema,
  preRegistrationExportSchema,
  preRegistrationSchema,
} from "./schemas";
import type { PreRegistrationRepository } from "./types";

export const PRE_REGISTRATION_NOTICE_VERSION = "1.0";

export async function createPreRegistration(
  input: unknown,
  repository: PreRegistrationRepository,
  now = new Date(),
) {
  const data = preRegistrationSchema.parse(input);
  const result = await repository.createOrFind({
    name: data.name,
    phone: formatBrazilianPhone(data.phone),
    normalizedPhone: data.phone,
    type: data.type,
    consentNoticeVersion: PRE_REGISTRATION_NOTICE_VERSION,
    now,
  });
  return { created: result.created };
}

function dateFilters(input: { from?: string; to?: string }) {
  return {
    from: input.from ? new Date(`${input.from}T00:00:00.000Z`) : undefined,
    to: input.to ? new Date(`${input.to}T23:59:59.999Z`) : undefined,
  };
}

export async function getPreRegistrationAdminOverview(
  actor: AdminActor,
  repository: PreRegistrationRepository,
) {
  assertAdminAccess(actor);
  return repository.metrics();
}

export async function listPreRegistrationsForAdmin(
  actor: AdminActor,
  input: unknown,
  repository: PreRegistrationRepository,
) {
  assertAdminAccess(actor);
  const filters = preRegistrationAdminSearchSchema.parse(input);
  const result = await repository.list({
    ...filters,
    ...dateFilters(filters),
  });
  return {
    items: result.items.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      type: item.type,
      createdAt: item.createdAt.toISOString(),
    })),
    page: filters.page,
    pageSize: filters.pageSize,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / filters.pageSize)),
  };
}

const safeCsvCell = (value: string) => {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
};

export async function exportPreRegistrationsCsv(
  actor: AdminActor,
  input: unknown,
  repository: PreRegistrationRepository,
) {
  assertAdminAccess(actor);
  const filters = preRegistrationExportSchema.parse(input);
  const rows = await repository.exportRows(
    { ...filters, ...dateFilters(filters) },
    10_000,
  );
  return [
    ["Nome", "WhatsApp", "Tipo", "Data"],
    ...rows.map((item) => [
      item.name,
      item.phone,
      item.type === "MOTOBOY" ? "Motoboy" : "Empresa",
      item.createdAt.toISOString(),
    ]),
  ]
    .map((row) => row.map(safeCsvCell).join(","))
    .join("\r\n");
}
