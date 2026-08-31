import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getCompanyRepeatDraft } from "@/server/company-history/company-history-service";
import { prismaCompanyHistoryRepository } from "@/server/company-history/prisma-company-history-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(["COMPANY"]);
    const { id } = await context.params;
    const draft = await getCompanyRepeatDraft(
      { userId: user.id, role: user.role },
      id,
      prismaCompanyHistoryRepository,
    );
    if (!draft)
      return NextResponse.json(
        { error: "Entrega não encontrada." },
        { status: 404 },
      );
    return NextResponse.json(
      { draft },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
