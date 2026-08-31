import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";
import {
  AccountActiveDeliveryError,
  AccountConflictError,
  AccountPasswordInvalidError,
  AccountRateLimitError,
} from "./errors";
export function accountErrorResponse(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError)
    return NextResponse.json(
      { error: "Revise os dados informados." },
      { status: 422 },
    );
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (
    error instanceof ForbiddenError ||
    error instanceof AccountPasswordInvalidError
  )
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (
    error instanceof AccountConflictError ||
    error instanceof AccountActiveDeliveryError
  )
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof AccountRateLimitError)
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  return internalErrorResponse("api.account", error);
}
