"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DELIVERY_EXTRA_TYPE_LABELS } from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type {
  DeliveryExtraType,
  DeliveryExtraView,
  DeliveryStatus,
} from "@/server/deliveries/types";

import { DeliveryExtrasSummary } from "./delivery-extras-summary";

const editableStatuses: DeliveryStatus[] = [
  "ACCEPTED",
  "MOTOBOY_TO_PICKUP",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
];

export function DeliveryExtrasPanel({
  deliveryId,
  deliveryStatus,
  extras,
  actorRole,
  onChanged,
}: {
  deliveryId: string;
  deliveryStatus: DeliveryStatus;
  extras?: DeliveryExtraView[];
  actorRole: "COMPANY" | "MOTOBOY";
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    type: "WAITING" as DeliveryExtraType,
    description: "",
    amount: "",
    note: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canAdd = editableStatuses.includes(deliveryStatus);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy("add");
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          description: form.description,
          ...(form.amount
            ? { amount: Number(form.amount.replace(",", ".")) }
            : {}),
          ...(form.note ? { note: form.note } : {}),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível incluir o adicional.",
          ),
        );
        return;
      }
      setForm({ type: "WAITING", description: "", amount: "", note: "" });
      setSuccess(
        "Adicional registrado. A outra parte deve confirmar ou rejeitar explicitamente.",
      );
      await onChanged();
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(null);
    }
  }

  async function respond(
    extraId: string,
    decision: "ACKNOWLEDGED" | "REJECTED",
  ) {
    setBusy(extraId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/deliveries/${deliveryId}/extras/${extraId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível responder ao adicional.",
          ),
        );
        return;
      }
      setSuccess(
        decision === "ACKNOWLEDGED"
          ? "Condição confirmada e registrada."
          : "Condição rejeitada e registrada.",
      );
      await onChanged();
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-xl font-extrabold">
        Condições adicionais
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        O valor original da oportunidade não é alterado. Uma condição surgida
        durante a corrida fica pendente até resposta da outra parte.
      </p>
      <div className="mt-5">
        <DeliveryExtrasSummary extras={extras} showHistory />
      </div>
      {extras
        ?.filter(
          (extra) =>
            extra.status === "PENDING" && extra.informedByRole !== actorRole,
        )
        .map((extra) => (
          <div
            key={extra.id}
            className="mt-4 flex flex-col gap-2 rounded-2xl border border-amber-200 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm font-bold">
              Responder: {DELIVERY_EXTRA_TYPE_LABELS[extra.type]}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => respond(extra.id, "ACKNOWLEDGED")}
              >
                Estou ciente
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy !== null}
                onClick={() => respond(extra.id, "REJECTED")}
              >
                Rejeitar
              </Button>
            </div>
          </div>
        ))}
      {error && (
        <p
          className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          role="status"
        >
          {success}
        </p>
      )}
      {canAdd && (
        <form
          onSubmit={add}
          className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2"
        >
          <FormField label="Tipo" htmlFor="runtime-extra-type" required>
            <Select
              id="runtime-extra-type"
              value={form.type}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  type: event.target.value as DeliveryExtraType,
                }))
              }
            >
              {Object.entries(DELIVERY_EXTRA_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </FormField>
          <FormField
            label="Valor informado"
            htmlFor="runtime-extra-amount"
            hint="Opcional · BRL"
          >
            <Input
              id="runtime-extra-amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) =>
                setForm((value) => ({ ...value, amount: event.target.value }))
              }
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="Descrição"
              htmlFor="runtime-extra-description"
              required
            >
              <Input
                id="runtime-extra-description"
                maxLength={240}
                value={form.description}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    description: event.target.value,
                  }))
                }
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField
              label="Observação"
              htmlFor="runtime-extra-note"
              hint="Opcional"
            >
              <Input
                id="runtime-extra-note"
                maxLength={300}
                value={form.note}
                onChange={(event) =>
                  setForm((value) => ({ ...value, note: event.target.value }))
                }
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={busy !== null || form.description.trim().length < 3}
            >
              {busy === "add" ? "Registrando..." : "Registrar novo adicional"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
