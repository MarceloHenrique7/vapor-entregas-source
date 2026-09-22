import { NextRequest } from "next/server";

import { handleLoginRequest } from "@/server/auth/login-request";
import { getPrelaunchEnv } from "@/server/config/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const prelaunchEnabled = getPrelaunchEnv().enabled;
  return handleLoginRequest(request, {
    authorize: (user) =>
      !prelaunchEnabled || user.role === "COMPANY" || user.role === "MOTOBOY",
    logContext: "api.auth.login",
  });
}
