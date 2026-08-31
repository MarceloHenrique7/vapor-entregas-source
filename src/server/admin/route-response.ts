import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";
import {
  AdminAccessDeniedError,
  AdminActionConflictError,
  AdminRateLimitError,
  AdminResourceNotFoundError,
} from "./errors";

export function adminErrorResponse(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError)
    return NextResponse.json(
      { error: "Revise os dados e filtros informados." },
      { status: 422 },
    );
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (
    error instanceof ForbiddenError ||
    error instanceof AdminAccessDeniedError
  )
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof AdminResourceNotFoundError)
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof AdminActionConflictError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof AdminRateLimitError)
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  return internalErrorResponse("api.admin", error);
}
