import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";
import { SubscriptionRequiredError } from "@/server/subscriptions/errors";

import {
  MotoboyOfflineError,
  MotoboyProfileNotFoundError,
  PresenceRateLimitError,
} from "./errors";

export function presenceErrorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Coordenadas inválidas.", fields: error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json(
      {
        error: "Sua sessão expirou ou sua conta está indisponível.",
        code: "SESSION_INVALID",
      },
      { status: 401 },
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message, code: "ROLE_FORBIDDEN" },
      { status: 403 },
    );
  }
  if (error instanceof SubscriptionRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "SUBSCRIPTION_REQUIRED" },
      { status: 402 },
    );
  }
  if (error instanceof MotoboyProfileNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof MotoboyOfflineError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof PresenceRateLimitError) {
    return NextResponse.json(
      { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  return internalErrorResponse("api.presence", error);
}
