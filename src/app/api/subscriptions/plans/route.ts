import { NextResponse } from "next/server";

import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { listPublicPlans } from "@/server/subscriptions/subscription-service";

export async function GET() {
  try {
    const plans = await listPublicPlans(prismaSubscriptionRepository);
    return NextResponse.json(
      { plans },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
