import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getPrisma } from "@/server/db/prisma";
import { subscribeToDeliveryEvents } from "@/server/deliveries/delivery-events";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const role = user.role === "COMPANY" ? "COMPANY" : "MOTOBOY";
    const profile =
      role === "COMPANY"
        ? await getPrisma().companyProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
          })
        : await getPrisma().motoboyProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });
    if (!profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado." },
        { status: 404 },
      );
    }

    let cleanup = () => undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const send = (event: { type: string; deliveryId: string }) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}\ndata: ${JSON.stringify({ deliveryId: event.deliveryId })}\n\n`,
            ),
          );
        };
        const unsubscribe = subscribeToDeliveryEvents({
          role,
          profileId: profile.id,
          send,
        });
        const heartbeat = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 25_000);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // The client may already have closed the stream.
          }
        };
        request.signal.addEventListener("abort", cleanup, { once: true });
        controller.enqueue(
          encoder.encode("retry: 5000\nevent: connected\ndata: {}\n\n"),
        );
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
