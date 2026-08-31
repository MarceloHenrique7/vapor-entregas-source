import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/server/auth/session";
import { internalErrorResponse } from "@/server/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json(
      { user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return internalErrorResponse("api.auth.session", error);
  }
}
