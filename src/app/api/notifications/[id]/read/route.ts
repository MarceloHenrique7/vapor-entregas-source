import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { markNotificationRead } from "@/server/notifications/notification-service";
import { notificationErrorResponse } from "@/server/notifications/route-response";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    const { id } = await context.params;
    const result = await markNotificationRead(user.id, id);
    if (!result)
      return NextResponse.json(
        { error: "Notificação não encontrada." },
        { status: 404 },
      );
    return NextResponse.json(result);
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
