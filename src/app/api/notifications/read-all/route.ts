import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { markAllNotificationsRead } from "@/server/notifications/notification-service";
import { notificationErrorResponse } from "@/server/notifications/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    return NextResponse.json(await markAllNotificationsRead(user.id));
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
