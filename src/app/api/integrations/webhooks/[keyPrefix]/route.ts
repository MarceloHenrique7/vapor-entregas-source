import { NextRequest, NextResponse } from "next/server";

import { ingestGenericWebhook } from "@/server/integrations/integration-service";
import { enforceIntegrationRateLimit } from "@/server/integrations/rate-limit";
import { integrationErrorResponse } from "@/server/integrations/route-response";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ keyPrefix: string }> },
) {
  try {
    const { keyPrefix } = await context.params;
    enforceIntegrationRateLimit(`webhook:${keyPrefix}`, 60);
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > 256_000)
      return NextResponse.json(
        { error: "Payload muito grande." },
        { status: 413 },
      );
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 256_000)
      return NextResponse.json(
        { error: "Payload muito grande." },
        { status: 413 },
      );
    const result = await ingestGenericWebhook({
      keyPrefix,
      body,
      timestamp: request.headers.get("x-vapor-timestamp"),
      signature: request.headers.get("x-vapor-signature"),
      eventId: request.headers.get("x-vapor-event-id"),
    });
    return NextResponse.json({ accepted: true, result });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
