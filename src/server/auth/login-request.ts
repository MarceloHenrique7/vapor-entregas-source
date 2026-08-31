import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { internalErrorResponse } from "@/server/observability/logger";

import { authenticateCredentials } from "./authenticate";
import { InvalidCredentialsError } from "./errors";
import {
  clearLoginThrottle,
  getLoginThrottleKey,
  isLoginThrottled,
  recordLoginThrottleFailure,
} from "./login-throttle";
import { prismaAuthRepository } from "./prisma-auth-repository";
import { createSession } from "./session";
import type { AuthenticatedUser } from "./types";
import { hasValidRequestOrigin } from "../http/origin";

export async function handleLoginRequest(
  request: NextRequest,
  options: {
    authorize: (user: AuthenticatedUser) => boolean;
    logContext: string;
  },
) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const throttleKey = getLoginThrottleKey(request);
  if (await isLoginThrottled(throttleKey)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "900" },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dados inválidos." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const user = await authenticateCredentials(
      body as { email: string; password: string },
      prismaAuthRepository,
    );
    if (!options.authorize(user)) {
      return NextResponse.json(
        { error: "Credenciais inválidas ou conta não autorizada." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    await clearLoginThrottle(throttleKey);
    await createSession(user.id);
    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      await recordLoginThrottleFailure(throttleKey);
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return internalErrorResponse(options.logContext, error);
  }
}
