import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentSessionUser,
  revokeCurrentSession,
} from "@/server/auth/session";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { endPresenceOnLogout } from "@/server/presence/logout-presence";
import { prismaPresenceRepository } from "@/server/presence/prisma-presence-repository";
import { internalErrorResponse } from "@/server/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  try {
    const user = await getCurrentSessionUser();
    await endPresenceOnLogout(user, prismaPresenceRepository);
    await revokeCurrentSession();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalErrorResponse("api.auth.logout", error);
  }
}
