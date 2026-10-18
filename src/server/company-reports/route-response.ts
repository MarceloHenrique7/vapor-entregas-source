import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  CompanyReportLimitError,
  CompanyReportProfileRequiredError,
} from "./errors";

export function companyReportErrorResponse(error: unknown) {
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof ForbiddenError)
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof CompanyReportProfileRequiredError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof CompanyReportLimitError)
    return NextResponse.json({ error: error.message }, { status: 422 });
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Revise os filtros do relatório.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  return internalErrorResponse("api.company-reports", error);
}
