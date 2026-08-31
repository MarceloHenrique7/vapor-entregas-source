import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { mercadoPagoSubscriptionProvider } from "@/server/subscriptions/mercado-pago-provider";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { enforceSubscriptionRateLimit } from "@/server/subscriptions/rate-limit";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { synchronizeProviderPlans } from "@/server/subscriptions/subscription-service";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem invalida." }, { status: 403 });
  }
  try {
    const user = await requireRole(["ADMIN"]);
    enforceSubscriptionRateLimit(user.id);
    const plans = await synchronizeProviderPlans(
      { userId: user.id, role: user.role, status: user.status },
      prismaSubscriptionRepository,
      mercadoPagoSubscriptionProvider,
    );
    return NextResponse.json({ plans });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
