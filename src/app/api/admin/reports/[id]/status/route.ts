import { NextRequest, NextResponse } from "next/server";
import { changeAdminReportStatus } from "@/server/admin/admin-service";
import { enforceAdminRateLimit } from "@/server/admin/admin-rate-limit";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  notifyReportUpdate,
  runNotificationTask,
} from "@/server/notifications/notification-service";
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAdminActor();
    enforceAdminRateLimit(actor.userId);
    const { id } = await context.params;
    const result = await changeAdminReportStatus(
      actor,
      id,
      await request.json(),
    );
    await runNotificationTask("report-update", () => notifyReportUpdate(id));
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
