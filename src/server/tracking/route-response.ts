import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  TrackingAccessDeniedError,
  TrackingExpiredError,
  TrackingNotFoundError,
  TrackingRateLimitError,
  TrackingUnavailableError,
} from "./errors";

export function trackingErrorResponse(error: unknown, publicRoute = false) {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados de rastreamento inválidos." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (
    error instanceof ForbiddenError ||
    error instanceof TrackingAccessDeniedError
  ) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof TrackingNotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof TrackingExpiredError) {
    return NextResponse.json(
      { error: error.message, code: "TRACKING_EXPIRED" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof TrackingUnavailableError) {
    return NextResponse.json(
      { error: error.message, code: "TRACKING_UNAVAILABLE" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof TrackingRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  return internalErrorResponse(
    publicRoute ? "api.tracking.public" : "api.tracking",
    error,
  );
}
