import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { addDeliveryExtra } from "@/server/delivery-extras/delivery-extra-service";
import { prismaDeliveryExtraRepository } from "@/server/delivery-extras/prisma-delivery-extra-repository";
import { deliveryExtraErrorResponse } from "@/server/delivery-extras/route-response";
import { enforceDeliveryRateLimit } from "@/server/deliveries/delivery-rate-limit";
import { publishDeliveryChangeById } from "@/server/deliveries/delivery-events";
import { hasValidRequestOrigin } from "@/server/http/origin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    enforceDeliveryRateLimit(user.id, "extra");
    const { id } = await context.params;
    const extra = await addDeliveryExtra(
      { userId: user.id, role: user.role },
      id,
      await request.json(),
      prismaDeliveryExtraRepository,
      new Date(),
    );
    await publishDeliveryChangeById(id, "adicional_alterado");
    return NextResponse.json({ extra }, { status: 201 });
  } catch (error) {
    return deliveryExtraErrorResponse(error);
  }
}
