import { NextRequest, NextResponse } from "next/server";

import { handleLoginRequest } from "@/server/auth/login-request";
import { getPrelaunchEnv } from "@/server/config/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (getPrelaunchEnv().enabled) {
    return NextResponse.json(
      { error: "Login público indisponível durante o pré-lançamento." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleLoginRequest(request, {
    authorize: () => true,
    logContext: "api.auth.login",
  });
}
