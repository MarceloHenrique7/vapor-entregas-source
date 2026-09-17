import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  CompanyProExportLimitError,
  CompanyProProfileRequiredError,
  CompanyProRequiredError,
} from "./errors";

export function companyProErrorResponse(error: unknown) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof CompanyProRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "COMPANY_PRO_REQUIRED" },
      { status: 403 },
    );
  }
  if (error instanceof CompanyProProfileRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof CompanyProExportLimitError) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Revise o período informado.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  return internalErrorResponse("api.company-pro", error);
}
