import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { listActorDeliveryHistory } from "@/server/deliveries/delivery-service";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const search = request.nextUrl.searchParams;
    const deliveries = await listActorDeliveryHistory(
      { userId: user.id, role: user.role },
      {
        status: search.get("status") || undefined,
        from: search.get("from") || undefined,
        to: search.get("to") || undefined,
      },
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
