import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { setMotoboyOffline } from "@/server/presence/presence-service";
import { prismaPresenceRepository } from "@/server/presence/prisma-presence-repository";
import { presenceErrorResponse } from "@/server/presence/route-response";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["MOTOBOY"]);
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const presence = await setMotoboyOffline(
      { userId: user.id, role: user.role },
      prismaPresenceRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json({ presence });
  } catch (error) {
    return presenceErrorResponse(error);
  }
}
