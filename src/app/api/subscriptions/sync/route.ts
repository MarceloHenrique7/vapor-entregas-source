import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { mercadoPagoSubscriptionProvider } from "@/server/subscriptions/mercado-pago-provider";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { enforceSubscriptionRateLimit } from "@/server/subscriptions/rate-limit";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { refreshMySubscription } from "@/server/subscriptions/subscription-service";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY"]);
    enforceSubscriptionRateLimit(user.id);
    const subscription = await refreshMySubscription(
      { userId: user.id, role: user.role, status: user.status },
      prismaSubscriptionRepository,
      mercadoPagoSubscriptionProvider,
      new Date(),
    );
    return NextResponse.json({ subscription });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
