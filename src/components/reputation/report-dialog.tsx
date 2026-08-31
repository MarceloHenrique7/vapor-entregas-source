"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { REPORT_CATEGORY_LABELS } from "@/config/reputation";
import {
  REPORT_CATEGORIES,
  type ReportCategory,
} from "@/server/reputation/types";

export function ReportDialog({
  open,
  deliveryId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  deliveryId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId, category, description }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível registrar a denúncia.");
        return;
      }
      setCategory("OTHER");
      setDescription("");
      onSuccess();
      onClose();
    } catch {
      setError("Erro de rede ao registrar a denúncia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title="Denunciar um problema"
      description="A denúncia ficará vinculada à entrega e somente você poderá consultá-la nesta etapa."
    >
      <div className="space-y-5">
        <FormField label="Categoria" htmlFor="report-category" required>
          <Select
            id="report-category"
            value={category}
            disabled={busy}
            onChange={(event) =>
              setCategory(event.target.value as ReportCategory)
            }
          >
            {REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {REPORT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Descrição"
          htmlFor="report-description"
          required
          hint="Entre 20 e 1.500 caracteres. Não informe CPF, RG ou dados desnecessários."
        >
          <textarea
            id="report-description"
            value={description}
            minLength={20}
            maxLength={1500}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-36 w-full resize-y rounded-2xl border border-line bg-white p-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </FormField>
        {error && (
          <p
            className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button
          variant="danger"
          className="w-full"
          disabled={busy || description.trim().length < 20}
          onClick={submit}
        >
          {busy ? "Registrando..." : "Registrar denúncia"}
        </Button>
      </div>
    </Dialog>
  );
}
