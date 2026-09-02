import "dotenv/config";

import { getSubscriptionEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { SubscriptionProviderError } from "@/server/subscriptions/errors";
import { mercadoPagoSubscriptionProvider } from "@/server/subscriptions/mercado-pago-provider";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import type {
  ProviderPlan,
  SubscriptionPlanRecord,
} from "@/server/subscriptions/types";

function prefix(value: string | undefined) {
  if (!value) return "not_configured";
  if (value.startsWith("TEST-")) return "TEST";
  if (value.startsWith("APP_USR-")) return "APP_USR";
  return "unknown";
}

function applicationId(value: string | undefined) {
  return /^(?:TEST|APP_USR)-(\d+)-/.exec(value ?? "")?.[1] ?? null;
}

function roleLabel(role: SubscriptionPlanRecord["role"]) {
  return role === "MOTOBOY" ? "motoboy" : "company";
}

function planMatchesConfiguration(
  remote: ProviderPlan,
  local: SubscriptionPlanRecord,
  appUrl: string,
) {
  return (
    remote.reason === `Vapor Entregas - Plano ${local.name}` &&
    Math.abs(remote.amount - local.monthlyPrice) < 0.001 &&
    remote.currency === "BRL" &&
    remote.frequency === 1 &&
    remote.frequencyType === "months" &&
    remote.trialDays === local.trialDays &&
    remote.backUrl === appUrl &&
    !["inactive", "canceled", "cancelled"].includes(
      remote.status?.toLowerCase() ?? "active",
    )
  );
}

function providerFailure(error: unknown) {
  if (!(error instanceof SubscriptionProviderError)) {
    return { status: null, code: "UNEXPECTED_ERROR", requestIdPresent: false };
  }
  return {
    status: error.providerStatus,
    code: error.providerCode,
    requestIdPresent: Boolean(error.providerRequestId),
  };
}

async function main() {
  const env = getSubscriptionEnv();
  const publicApplicationId = applicationId(
    env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
  );
  const accessApplicationId = applicationId(env.MERCADO_PAGO_ACCESS_TOKEN);
  const credentialApplicationIdsMatch =
    publicApplicationId && accessApplicationId
      ? publicApplicationId === accessApplicationId
      : null;
  const issues: string[] = [];

  if (!env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY) {
    issues.push("PUBLIC_KEY_NOT_CONFIGURED");
  }
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    issues.push("ACCESS_TOKEN_NOT_CONFIGURED");
  }

  let seller: Awaited<
    ReturnType<typeof mercadoPagoSubscriptionProvider.getSellerAccount>
  > | null = null;
  let sellerFailure: ReturnType<typeof providerFailure> | null = null;
  try {
    seller = await mercadoPagoSubscriptionProvider.getSellerAccount();
  } catch (error) {
    sellerFailure = providerFailure(error);
    issues.push("SELLER_ACCOUNT_NOT_RESOLVED");
  }

  if (seller?.siteId !== "MLB") issues.push("SELLER_SITE_IS_NOT_BRAZIL");
  if (env.MERCADO_PAGO_MODE === "test" && seller?.testUser === false) {
    issues.push("TEST_MODE_WITH_NON_TEST_SELLER");
  }
  if (env.MERCADO_PAGO_MODE === "production" && seller?.testUser === true) {
    issues.push("PRODUCTION_MODE_WITH_TEST_SELLER");
  }
  if (credentialApplicationIdsMatch === false) {
    issues.push("PUBLIC_KEY_ACCESS_TOKEN_APPLICATION_MISMATCH");
  }

  const localPlans = (await prismaSubscriptionRepository.listPlans()).filter(
    (plan) => plan.active,
  );
  const remotePlanIds = new Set(
    (await mercadoPagoSubscriptionProvider.searchPlans()).map(
      (plan) => plan.id,
    ),
  );
  const plans = [];
  for (const local of localPlans) {
    const base = {
      role: roleLabel(local.role),
      providerPlanIdPresent: Boolean(local.externalPlanId),
      providerModeMatchesRuntime:
        local.externalPlanMode === env.MERCADO_PAGO_MODE,
    };
    if (!local.externalPlanId) {
      issues.push(`${local.role}_PROVIDER_PLAN_ID_MISSING`);
      plans.push({
        ...base,
        lookupStatus: null,
        planFound: false,
        foundInSearch: false,
        collectorMatchesSeller: null,
        applicationMatchesAccessToken: null,
        configurationMatchesDatabase: false,
      });
      continue;
    }
    try {
      const remote = await mercadoPagoSubscriptionProvider.getPlan(
        local.externalPlanId,
      );
      const collectorMatchesSeller = seller
        ? remote.collectorId === seller.id
        : null;
      const configurationMatchesDatabase = planMatchesConfiguration(
        remote,
        local,
        env.NEXT_PUBLIC_APP_URL,
      );
      if (!base.providerModeMatchesRuntime)
        issues.push(`${local.role}_PROVIDER_MODE_MISMATCH`);
      if (collectorMatchesSeller === false)
        issues.push(`${local.role}_PLAN_COLLECTOR_MISMATCH`);
      if (remote.belongsToCurrentApplication === false)
        issues.push(`${local.role}_PLAN_APPLICATION_MISMATCH`);
      if (!configurationMatchesDatabase)
        issues.push(`${local.role}_PLAN_CONFIGURATION_MISMATCH`);
      if (!remotePlanIds.has(remote.id))
        issues.push(`${local.role}_PLAN_NOT_FOUND_IN_SEARCH`);
      plans.push({
        ...base,
        lookupStatus: 200,
        planFound: true,
        foundInSearch: remotePlanIds.has(remote.id),
        planStatus: remote.status,
        collectorMatchesSeller,
        applicationMatchesAccessToken: remote.belongsToCurrentApplication,
        applicationIdPresent: remote.applicationId !== null,
        collectorIdPresent: remote.collectorId !== null,
        configurationMatchesDatabase,
      });
    } catch (error) {
      const failure = providerFailure(error);
      issues.push(`${local.role}_PLAN_LOOKUP_FAILED`);
      plans.push({
        ...base,
        lookupStatus: failure.status,
        providerCode: failure.code,
        providerRequestIdPresent: failure.requestIdPresent,
        planFound: false,
        foundInSearch: false,
        collectorMatchesSeller: null,
        applicationMatchesAccessToken: null,
        configurationMatchesDatabase: false,
      });
    }
  }

  if (localPlans.length !== 2) issues.push("ACTIVE_PLAN_COUNT_IS_NOT_TWO");

  console.info(
    JSON.stringify(
      {
        diagnostic: "mercado-pago-account-plan-integrity",
        mode: env.MERCADO_PAGO_MODE,
        credentials: {
          publicKeyConfigured: Boolean(env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY),
          accessTokenConfigured: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN),
          publicKeyPrefix: prefix(env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY),
          accessTokenPrefix: prefix(env.MERCADO_PAGO_ACCESS_TOKEN),
          publicKeyApplicationIdPresent: Boolean(publicApplicationId),
          accessTokenApplicationIdPresent: Boolean(accessApplicationId),
          applicationIdsMatch: credentialApplicationIdsMatch,
        },
        seller: seller
          ? {
              resolved: true,
              idPresent: true,
              siteId: seller.siteId,
              isBrazil: seller.siteId === "MLB",
              testUser: seller.testUser,
              modeMatchesSeller:
                seller.testUser === null
                  ? null
                  : env.MERCADO_PAGO_MODE === "test"
                    ? seller.testUser
                    : !seller.testUser,
            }
          : {
              resolved: false,
              failure: sellerFailure,
            },
        plans,
        payer: {
          validated: false,
          reason:
            "Payer identity requires a new ephemeral card token during checkout.",
        },
        ok: issues.length === 0,
        issues,
      },
      null,
      2,
    ),
  );
  if (issues.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        diagnostic: "mercado-pago-account-plan-integrity",
        ok: false,
        failure: providerFailure(error),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
