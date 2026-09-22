import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  RegistrationConflictError,
  RegistrationRateLimitError,
} from "./errors";
import { internalErrorResponse } from "@/server/observability/logger";

export function registrationErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Revise os campos destacados.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  if (error instanceof RegistrationConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (error instanceof RegistrationRateLimitError) {
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

  return internalErrorResponse("api.registration", error);
}
