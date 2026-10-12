import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { notificationErrorResponse } from "@/server/notifications/route-response";
import {
  getWebPushConfiguration,
  removePushSubscription,
  savePushSubscription,
  sendWebPushToUsers,
} from "@/server/notifications/push-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    return NextResponse.json(getWebPushConfiguration(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    const result = await savePushSubscription(
      user.id,
      await request.json(),
      request.headers.get("user-agent"),
    );
    const targetUrl =
      user.role === "MOTOBOY"
        ? "/app/motoboy/notificacoes"
        : user.role === "COMPANY"
          ? "/app/empresa/notificacoes"
          : "/admin";
    await sendWebPushToUsers([user.id], {
      type: "ADMIN_NOTICE",
      title: "Notificações ativadas",
      message: "Este dispositivo já pode receber avisos da Vapor Entregas.",
      path: targetUrl,
      tag: "push-enabled",
    });
    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return notificationErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    return NextResponse.json(
      await removePushSubscription(user.id, await request.json()),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
