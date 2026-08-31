import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import {
  addFavorite,
  listFavorites,
} from "@/server/reputation/reputation-service";
import { reputationErrorResponse } from "@/server/reputation/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY"]);
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const favorites = await listFavorites(
      { userId: user.id, role: user.role },
      prismaReputationRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json(
      { favorites },
      { headers: { "Cache-Control": "private, no-store" } },
    );
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
    const user = await requireRole(["COMPANY"]);
    const favorite = await addFavorite(
      { userId: user.id, role: user.role },
      await request.json(),
      prismaReputationRepository,
      new Date(),
    );
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error) {
    return reputationErrorResponse(error);
  }
}
