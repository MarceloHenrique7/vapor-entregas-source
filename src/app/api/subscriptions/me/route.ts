import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { getMySubscription } from "@/server/subscriptions/subscription-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY"]);
    const result = await getMySubscription(
      { userId: user.id, role: user.role, status: user.status },
      prismaSubscriptionRepository,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
