import { NextResponse } from "next/server";

import { OPPORTUNITY_RADIUS_KM } from "@/config/delivery";
import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { listMotoboyOpportunities } from "@/server/deliveries/delivery-service";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["MOTOBOY"]);
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const opportunities = await listMotoboyOpportunities(
      { userId: user.id, role: user.role },
      prismaDeliveryRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
      OPPORTUNITY_RADIUS_KM,
    );
    return NextResponse.json(
      { opportunities },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
