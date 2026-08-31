import { NextRequest, NextResponse } from "next/server";

import { handleLoginRequest } from "@/server/auth/login-request";
import { getPrelaunchEnv } from "@/server/config/env";

export async function POST(request: NextRequest) {
  const prelaunch = getPrelaunchEnv();
  if (!prelaunch.enabled) {
    return NextResponse.json(
      { error: "Recurso não encontrado." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleLoginRequest(request, {
    authorize: (user) => prelaunch.testUserIds.includes(user.id),
    logContext: "api.prelaunch.login.test",
  });
}
