import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import {
  createRating,
  getRatingOverview,
} from "@/server/reputation/reputation-service";
import { reputationErrorResponse } from "@/server/reputation/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const overview = await getRatingOverview(
      { userId: user.id, role: user.role },
      prismaReputationRepository,
    );
    return NextResponse.json(overview, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return reputationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const rating = await createRating(
      { userId: user.id, role: user.role },
      await request.json(),
      prismaReputationRepository,
      new Date(),
    );
    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    return reputationErrorResponse(error);
  }
}
