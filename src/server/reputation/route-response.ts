import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  DeliveryNotEligibleError,
  DuplicateFavoriteError,
  DuplicateRatingError,
  DuplicateReportError,
  FavoriteNotFoundError,
  ReportRateLimitError,
  ReputationAccessDeniedError,
} from "./errors";

export function reputationErrorResponse(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json(
      { error: "Revise os dados informados." },
      { status: 422 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (
    error instanceof ForbiddenError ||
    error instanceof ReputationAccessDeniedError
  ) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof FavoriteNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (
    error instanceof DeliveryNotEligibleError ||
    error instanceof DuplicateFavoriteError ||
    error instanceof DuplicateRatingError ||
    error instanceof DuplicateReportError
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof ReportRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  return internalErrorResponse("api.reputation", error);
}
