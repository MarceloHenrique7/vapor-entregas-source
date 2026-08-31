import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { quoteDelivery } from "@/server/pricing/pricing-service";
import { prismaPricingRepository } from "@/server/pricing/prisma-pricing-repository";
import { getDistanceProvider } from "@/server/routing/distance-provider";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const user = await requireRole(["COMPANY"]);
    enforceDeliveryRateLimit(user.id, "quote");
    const quote = await quoteDelivery(
      { userId: user.id, role: user.role, status: user.status },
      await request.json(),
      prismaPricingRepository,
      getDistanceProvider(),
      new Date(),
    );
    return NextResponse.json(
      { quote },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
