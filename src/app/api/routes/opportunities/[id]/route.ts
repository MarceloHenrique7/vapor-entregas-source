import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { getDistanceProvider } from "@/server/routing/distance-provider";
import { estimateRouteToOpportunity } from "@/server/routing/opportunity-route-service";
import { prismaOpportunityRouteRepository } from "@/server/routing/prisma-opportunity-route-repository";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { assertOperationalSubscription } from "@/server/subscriptions/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["MOTOBOY"]);
    await assertOperationalSubscription(user.id, prismaSubscriptionRepository);
    enforceDeliveryRateLimit(user.id, "route");
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const { id } = await context.params;
    const route = await estimateRouteToOpportunity(
      { userId: user.id, role: user.role },
      id,
      prismaOpportunityRouteRepository,
      getDistanceProvider(),
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json(
      { route },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
