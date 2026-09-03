import { requireRole } from "@/server/auth/guards";
import { subscribeToNotificationEvents } from "@/server/notifications/notification-events";
import { notificationErrorResponse } from "@/server/notifications/route-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

export async function GET(request: Request) {
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY", "ADMIN"]);
    let cleanup = () => undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const send = () => {
          if (!closed) {
            controller.enqueue(
              encoder.encode("event: notification\ndata: {}\n\n"),
            );
          }
        };
        const unsubscribe = subscribeToNotificationEvents({
          userId: user.id,
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
            // The browser may already have closed the stream.
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
    return notificationErrorResponse(error);
  }
}
