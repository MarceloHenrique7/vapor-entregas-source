import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  DeliveryExtraAccessDeniedError,
  DeliveryExtraConflictError,
  DeliveryExtraNotFoundError,
} from "./errors";

export function deliveryExtraErrorResponse(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Revise os dados do adicional.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (
    error instanceof ForbiddenError ||
    error instanceof DeliveryExtraAccessDeniedError
  )
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof DeliveryExtraNotFoundError)
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof DeliveryExtraConflictError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  return internalErrorResponse("api.delivery-extras", error);
}
