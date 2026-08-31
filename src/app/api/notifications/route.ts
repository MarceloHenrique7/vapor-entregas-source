import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { listNotifications } from "@/server/notifications/notification-service";
import { notificationErrorResponse } from "@/server/notifications/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    const data = await listNotifications(user.id, {
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
