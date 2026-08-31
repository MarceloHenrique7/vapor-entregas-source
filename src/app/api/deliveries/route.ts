import { NextRequest, NextResponse } from "next/server";

import { DELIVERY_OPPORTUNITY_TTL_MINUTES } from "@/config/delivery";
import { requireRole } from "@/server/auth/guards";
import {
  createDelivery,
  listCompanyDeliveries,
} from "@/server/deliveries/delivery-service";
import { publishDeliveryEvent } from "@/server/deliveries/delivery-events";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  notifyNewOpportunity,
  runNotificationTask,
} from "@/server/notifications/notification-service";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { assertOperationalSubscription } from "@/server/subscriptions/subscription-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY"]);
    const deliveries = await listCompanyDeliveries(
      { userId: user.id, role: user.role },
      prismaDeliveryRepository,
    );
    return NextResponse.json(
      { deliveries },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["COMPANY"]);
    await assertOperationalSubscription(user.id, prismaSubscriptionRepository);
    enforceDeliveryRateLimit(user.id, "create");
    const delivery = await createDelivery(
      { userId: user.id, role: user.role },
      await request.json(),
      prismaDeliveryRepository,
      new Date(),
      DELIVERY_OPPORTUNITY_TTL_MINUTES,
    );
    publishDeliveryEvent({
      type: "nova_corrida",
      deliveryId: delivery.id,
      audience: { kind: "motoboys" },
    });
    await runNotificationTask("new-opportunity", () =>
      notifyNewOpportunity(delivery.id),
    );
    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
