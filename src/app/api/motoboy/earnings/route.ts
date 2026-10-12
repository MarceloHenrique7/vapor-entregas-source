import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";
import { getMotoboyEarnings } from "@/server/earnings/earnings-service";
import { prismaEarningsRepository } from "@/server/earnings/prisma-earnings-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["MOTOBOY"]);
    const earnings = await getMotoboyEarnings(
      user.id,
      request.nextUrl.searchParams.get("period") ?? "30",
      prismaEarningsRepository,
    );
    return NextResponse.json(
      { earnings },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
