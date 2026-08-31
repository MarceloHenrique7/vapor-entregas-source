import { NextRequest, NextResponse } from "next/server";

import { OPPORTUNITY_RADIUS_KM } from "@/config/delivery";
import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { acceptDelivery } from "@/server/deliveries/delivery-service";
import { publishDeliveryEvent } from "@/server/deliveries/delivery-events";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  notifyDeliveryEvent,
  runNotificationTask,
} from "@/server/notifications/notification-service";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { assertOperationalSubscription } from "@/server/subscriptions/subscription-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["MOTOBOY"]);
    await assertOperationalSubscription(user.id, prismaSubscriptionRepository);
    enforceDeliveryRateLimit(user.id, "accept");
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const { id } = await context.params;
    const rawBody = await request.text();
    const delivery = await acceptDelivery(
      { userId: user.id, role: user.role },
      id,
      prismaDeliveryRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
      OPPORTUNITY_RADIUS_KM,
      rawBody ? JSON.parse(rawBody) : {},
    );
    publishDeliveryEvent({
      type: "corrida_aceita",
      deliveryId: delivery.id,
      audience: { kind: "company", profileId: delivery.companyId },
    });
    if (delivery.motoboyId) {
      publishDeliveryEvent({
        type: "corrida_aceita",
        deliveryId: delivery.id,
        audience: { kind: "motoboy", profileId: delivery.motoboyId },
      });
    }
    await runNotificationTask("delivery-accepted", () =>
      notifyDeliveryEvent(delivery.id, "accepted"),
    );
    return NextResponse.json({ delivery });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
