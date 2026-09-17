import type { DeliveryPaymentStatus } from "./types";

export type DeliveryPaymentAction =
  "MARK_PAID" | "CONFIRM_RECEIPT" | "REPORT_NOT_RECEIVED";

export type DeliveryPaymentTransition =
  | { kind: "update"; status: DeliveryPaymentStatus }
  | { kind: "noop" }
  | { kind: "forbidden" }
  | { kind: "conflict" };

export function resolveDeliveryPaymentTransition(
  role: "COMPANY" | "MOTOBOY",
  action: DeliveryPaymentAction,
  current: DeliveryPaymentStatus,
): DeliveryPaymentTransition {
  if (role === "COMPANY") {
    if (action !== "MARK_PAID") return { kind: "forbidden" };
    if (current === "CONFIRMED") return { kind: "conflict" };
    if (current === "REPORTED_PAID") return { kind: "noop" };
    return { kind: "update", status: "REPORTED_PAID" };
  }
  if (action === "MARK_PAID") return { kind: "forbidden" };
  if (action === "CONFIRM_RECEIPT") {
    if (current === "CONFIRMED") return { kind: "noop" };
    return { kind: "update", status: "CONFIRMED" };
  }
  if (current === "CONFIRMED") return { kind: "conflict" };
  return {
    kind: "update",
    status:
      current === "REPORTED_PAID" || current === "DISPUTED"
        ? "DISPUTED"
        : "PENDING",
  };
}
