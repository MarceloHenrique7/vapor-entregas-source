import "dotenv/config";

import { getSubscriptionEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { SubscriptionProviderError } from "@/server/subscriptions/errors";
import { mercadoPagoSubscriptionProvider } from "@/server/subscriptions/mercado-pago-provider";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import {
  ensureProviderPlan,
  isProviderPlanNotFoundError,
} from "@/server/subscriptions/subscription-service";
import type {
  ProviderPlan,
  SubscriptionPlanRecord,
} from "@/server/subscriptions/types";

function maskedId(value: string | null) {
  if (!value) return "ausente";
  if (value.length <= 10) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 6)}***${value.slice(-4)}`;
}

function roleLabel(role: SubscriptionPlanRecord["role"]) {
  return role === "MOTOBOY" ? "Motoboy" : "Empresa";
}

function isActiveProviderPlan(plan: ProviderPlan) {
  return !["inactive", "canceled", "cancelled"].includes(
    plan.status?.toLowerCase() ?? "active",
  );
}

function matchesInternalConfiguration(
  remote: ProviderPlan,
  local: SubscriptionPlanRecord,
) {
  const { NEXT_PUBLIC_APP_URL } = getSubscriptionEnv();
  return (
    remote.reason === `Vapor Entregas - Plano ${local.name}` &&
    Math.abs(remote.amount - local.monthlyPrice) < 0.001 &&
    remote.currency === "BRL" &&
    remote.frequency === 1 &&
    remote.frequencyType === "months" &&
    remote.trialDays === local.trialDays &&
    remote.backUrl === NEXT_PUBLIC_APP_URL &&
    isActiveProviderPlan(remote)
  );
}

function safeFailureStatus(error: unknown) {
  if (isProviderPlanNotFoundError(error)) return "NÃO ENCONTRADO";
  if (error instanceof SubscriptionProviderError) {
    return `ERRO DO PROVEDOR (HTTP ${error.providerStatus ?? "indisponível"})`;
  }
  return "ERRO DE VERIFICAÇÃO";
}

async function inspectPlan(plan: SubscriptionPlanRecord) {
  const { MERCADO_PAGO_MODE } = getSubscriptionEnv();
  const label = roleLabel(plan.role);
  if (!plan.externalPlanId || plan.externalPlanMode !== MERCADO_PAGO_MODE) {
    console.info(
      `${label}: NÃO ENCONTRADO (ID ${maskedId(plan.externalPlanId)}, modo ${plan.externalPlanMode ?? "ausente"})`,
    );
    return false;
  }

  try {
    const remote = await mercadoPagoSubscriptionProvider.getPlan(
      plan.externalPlanId,
    );
    const valid =
      remote.id === plan.externalPlanId &&
      remote.belongsToCurrentApplication !== false &&
      matchesInternalConfiguration(remote, plan);
    console.info(`${label}: ${valid ? "OK" : "INCOMPATÍVEL"}`);
    console.info(
      JSON.stringify({
        providerPlanIdPresent: true,
        providerPlanIdMasked: maskedId(plan.externalPlanId),
        lookupStatus: 200,
        planFound: true,
        planStatus: remote.status,
        applicationIdPresent: remote.applicationId !== null,
        collectorIdPresent: remote.collectorId !== null,
      }),
    );
    return valid;
  } catch (error) {
    console.info(`${label}: ${safeFailureStatus(error)}`);
    console.info(
      JSON.stringify({
        providerPlanIdPresent: true,
        providerPlanIdMasked: maskedId(plan.externalPlanId),
        lookupStatus:
          error instanceof SubscriptionProviderError
            ? error.providerStatus
            : null,
        planFound: false,
        planStatus: null,
        applicationIdPresent: false,
        collectorIdPresent: false,
      }),
    );
    return false;
  }
}

async function main() {
  const repair = process.argv.includes("--repair");
  const plans = (await prismaSubscriptionRepository.listPlans()).filter(
    (plan) => plan.active,
  );
  let valid = true;

  for (const plan of plans) {
    if (repair) {
      await ensureProviderPlan(
        plan,
        prismaSubscriptionRepository,
        mercadoPagoSubscriptionProvider,
      );
      const updated = await prismaSubscriptionRepository.getPlanForRole(
        plan.role,
      );
      valid = Boolean(updated && (await inspectPlan(updated))) && valid;
    } else {
      valid = (await inspectPlan(plan)) && valid;
    }
  }

  const searchablePlans = await mercadoPagoSubscriptionProvider.searchPlans();
  for (const plan of plans) {
    const found = Boolean(
      plan.externalPlanId &&
      searchablePlans.some((remote) => remote.id === plan.externalPlanId),
    );
    console.info(
      `Busca ${roleLabel(plan.role)}: ${found ? "ENCONTRADO" : "NÃO ENCONTRADO"}`,
    );
    valid = found && valid;
  }

  if (plans.length !== 2) {
    console.info(`Planos ativos encontrados: ${plans.length}; esperado: 2.`);
    valid = false;
  }
  if (!valid) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof SubscriptionProviderError
        ? `Falha segura ao verificar planos (HTTP ${error.providerStatus ?? "indisponível"}).`
        : "Falha segura ao verificar os planos.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
