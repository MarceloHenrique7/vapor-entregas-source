import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPresenceEnv } from "@/server/config/env";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { setMotoboyOnline } from "@/server/presence/presence-service";
import { prismaPresenceRepository } from "@/server/presence/prisma-presence-repository";
import { presenceErrorResponse } from "@/server/presence/route-response";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { assertOperationalSubscription } from "@/server/subscriptions/subscription-service";

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
    await assertOperationalSubscription(user.id, prismaSubscriptionRepository);
    const { ONLINE_PRESENCE_TTL_MINUTES } = getPresenceEnv();
    const presence = await setMotoboyOnline(
      { userId: user.id, role: user.role },
      await request.json(),
      prismaPresenceRepository,
      new Date(),
      ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json({ presence });
  } catch (error) {
    return presenceErrorResponse(error);
  }
}
