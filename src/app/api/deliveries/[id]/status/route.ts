import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { advanceDeliveryStatus } from "@/server/deliveries/delivery-service";
import { publishDeliveryChange } from "@/server/deliveries/delivery-events";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  notifyDeliveryEvent,
  runNotificationTask,
} from "@/server/notifications/notification-service";

export const dynamic = "force-dynamic";

export async function PATCH(
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
    enforceDeliveryRateLimit(user.id, "transition");
    const { id } = await context.params;
    const delivery = await advanceDeliveryStatus(
      { userId: user.id, role: user.role },
      id,
      await request.json(),
      prismaDeliveryRepository,
      new Date(),
    );
    publishDeliveryChange(delivery, "status_alterado");
    await runNotificationTask("delivery-status", () =>
      notifyDeliveryEvent(
        delivery.id,
        delivery.status === "COMPLETED" ? "completed" : "status",
      ),
    );
    return NextResponse.json({ delivery });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
