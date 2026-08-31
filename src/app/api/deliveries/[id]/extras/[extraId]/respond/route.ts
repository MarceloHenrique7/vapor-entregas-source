import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { respondToDeliveryExtra } from "@/server/delivery-extras/delivery-extra-service";
import { prismaDeliveryExtraRepository } from "@/server/delivery-extras/prisma-delivery-extra-repository";
import { deliveryExtraErrorResponse } from "@/server/delivery-extras/route-response";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { publishDeliveryChangeById } from "@/server/deliveries/delivery-events";
import { hasValidRequestOrigin } from "@/server/http/origin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; extraId: string }> },
) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    enforceDeliveryRateLimit(user.id, "extra");
    const { id, extraId } = await context.params;
    const extra = await respondToDeliveryExtra(
      { userId: user.id, role: user.role },
      id,
      extraId,
      await request.json(),
      prismaDeliveryExtraRepository,
      new Date(),
    );
    await publishDeliveryChangeById(id, "adicional_alterado");
    return NextResponse.json({ extra });
  } catch (error) {
    return deliveryExtraErrorResponse(error);
  }
}
