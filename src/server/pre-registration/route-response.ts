import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { AdminRateLimitError } from "@/server/admin/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  PreRegistrationPayloadTooLargeError,
  PreRegistrationRateLimitError,
} from "./errors";

export function preRegistrationErrorResponse(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json(
      { error: "Revise os dados informados." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof PreRegistrationPayloadTooLargeError) {
    return NextResponse.json(
      { error: error.message },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof PreRegistrationRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }
  if (error instanceof AdminRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": String(error.retryAfterSeconds),
        },
      },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return internalErrorResponse("api.pre-registration", error);
}
