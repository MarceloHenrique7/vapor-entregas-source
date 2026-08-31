import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import {
  getCompanyMotoboyRelationship,
  parseSearchParams,
} from "@/server/company-history/company-history-service";
import { prismaCompanyHistoryRepository } from "@/server/company-history/prisma-company-history-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["COMPANY"]);
    const { id } = await context.params;
    const result = await getCompanyMotoboyRelationship(
      { userId: user.id, role: user.role },
      id,
      parseSearchParams(request.nextUrl.searchParams),
      prismaCompanyHistoryRepository,
    );
    if (!result)
      return NextResponse.json(
        { error: "Relacionamento não encontrado." },
        { status: 404 },
      );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
