import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { locationErrorResponse } from "@/server/locations/route-response";
import { coordinatesSchema } from "@/server/locations/schemas";
import { getGeocodingProvider } from "@/server/maps/geocoding-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    await requireRole(["COMPANY", "ADMIN"]);
    const coordinates = coordinatesSchema.parse(await request.json());
    const result = await getGeocodingProvider().reverse(coordinates);
    return NextResponse.json({ result });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
