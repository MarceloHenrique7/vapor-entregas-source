import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import { removeFavorite } from "@/server/reputation/reputation-service";
import { reputationErrorResponse } from "@/server/reputation/route-response";

export async function DELETE(
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
    const user = await requireRole(["COMPANY"]);
    const { id } = await context.params;
    await removeFavorite(
      { userId: user.id, role: user.role },
      id,
      prismaReputationRepository,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return reputationErrorResponse(error);
  }
}
