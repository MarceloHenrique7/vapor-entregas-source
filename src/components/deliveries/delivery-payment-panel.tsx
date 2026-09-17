"use client";

import { useState } from "react";

import { DELIVERY_PAYMENT_STATUS_LABELS } from "@/config/delivery";
import { trackMetaCustomEvent } from "@/lib/analytics/meta-pixel";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type { DeliveryView } from "@/server/deliveries/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const paymentBadgeVariant = {
  UNTRACKED: "neutral",
  PENDING: "warning",
  REPORTED_PAID: "info",
  CONFIRMED: "success",
  DISPUTED: "warning",
} as const;

export function DeliveryPaymentPanel({
  delivery,
  actorRole,
  onUpdated,
  compact = false,
}: {
  delivery: DeliveryView;
  actorRole: "COMPANY" | "MOTOBOY";
  onUpdated: (delivery: DeliveryView) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(
    action: "MARK_PAID" | "CONFIRM_RECEIPT" | "REPORT_NOT_RECEIVED",
  ) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        delivery?: DeliveryView;
        error?: string;
      };
      if (!response.ok || !payload.delivery) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível atualizar o pagamento.",
          ),
        );
        return;
      }
      onUpdated(payload.delivery);
      if (action === "MARK_PAID") {
        trackMetaCustomEvent("PaymentMarkedPaid", { actor_role: actorRole });
      } else if (action === "CONFIRM_RECEIPT") {
        trackMetaCustomEvent("PaymentConfirmed", { actor_role: actorRole });
      }
      setSuccess(
        action === "MARK_PAID"
          ? "Pagamento informado ao motoboy."
          : action === "CONFIRM_RECEIPT"
            ? "Recebimento confirmado."
            : "Informação registrada.",
      );
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const completed = delivery.status === "COMPLETED";
  const companyCanMark =
    actorRole === "COMPANY" &&
    completed &&
    delivery.paymentStatus !== "REPORTED_PAID" &&
    delivery.paymentStatus !== "CONFIRMED";
  const motoboyCanRespond =
    actorRole === "MOTOBOY" &&
    completed &&
    delivery.paymentStatus !== "CONFIRMED";

  return (
    <section
      className={
        compact
          ? "mt-4 rounded-2xl border border-line bg-canvas/60 p-4"
          : "rounded-2xl border border-line bg-canvas/60 p-5"
      }
      aria-label="Pagamento direto da entrega"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
            VaporPay · registro declaratório
          </p>
          <p className="mt-1 text-sm text-muted">
            A Vapor não recebe, retém nem repassa o valor desta entrega.
          </p>
        </div>
        <Badge variant={paymentBadgeVariant[delivery.paymentStatus]}>
          {DELIVERY_PAYMENT_STATUS_LABELS[delivery.paymentStatus]}
        </Badge>
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {success}
        </p>
      )}
      {!completed && (
        <p className="mt-3 text-sm text-muted">
          As confirmações ficam disponíveis depois que a entrega for concluída.
        </p>
      )}
      {(companyCanMark || motoboyCanRespond) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {companyCanMark && (
            <Button disabled={busy} onClick={() => submit("MARK_PAID")}>
              {busy ? "Registrando..." : "Marcar como pago"}
            </Button>
          )}
          {motoboyCanRespond && (
            <>
              <Button disabled={busy} onClick={() => submit("CONFIRM_RECEIPT")}>
                {busy ? "Registrando..." : "Confirmar recebimento"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => submit("REPORT_NOT_RECEIVED")}
              >
                Ainda não recebi
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
