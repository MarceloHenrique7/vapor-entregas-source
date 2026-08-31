import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getCurrentMotoboyDelivery } from "@/server/deliveries/delivery-service";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["MOTOBOY"]);
    const delivery = await getCurrentMotoboyDelivery(
      { userId: user.id, role: user.role },
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
