import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { getMotoboyPresence } from "@/server/presence/presence-service";
import { prismaPresenceRepository } from "@/server/presence/prisma-presence-repository";
import { presenceErrorResponse } from "@/server/presence/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["MOTOBOY"]);
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const presence = await getMotoboyPresence(
      { userId: user.id, role: user.role },
      prismaPresenceRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json(
      { presence },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return presenceErrorResponse(error);
  }
}
