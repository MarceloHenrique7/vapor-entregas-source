import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

export function notificationErrorResponse(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof ForbiddenError)
    return NextResponse.json({ error: error.message }, { status: 403 });
  return internalErrorResponse("api.notifications", error);
}
