import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getDeliveryDetails } from "@/server/deliveries/delivery-service";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const { id } = await context.params;
    const delivery = await getDeliveryDetails(
      { userId: user.id, role: user.role },
      id,
      prismaDeliveryRepository,
    );
    return NextResponse.json(
      { delivery },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
