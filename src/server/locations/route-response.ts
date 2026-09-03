import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { GeocodingUnavailableError } from "@/server/maps/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import { LocationNotFoundError, LocationRateLimitError } from "./errors";

export function locationErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Revise os dados da localização.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof LocationNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof LocationRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  if (error instanceof GeocodingUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return internalErrorResponse("api.locations", error);
}
