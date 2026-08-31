"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";

import { StarRating } from "./star-rating";

export function RatingDialog({
  open,
  deliveryId,
  reviewedName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  deliveryId: string;
  reviewedName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!score) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId, score, comment }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível enviar a avaliação.");
        return;
      }
      setScore(0);
      setComment("");
      onSuccess();
      onClose();
    } catch {
      setError("Erro de rede ao enviar a avaliação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title="Como foi a entrega?"
      description={`Sua avaliação de ${reviewedName} será registrada. O comentário não será público no MVP.`}
    >
      <div className="space-y-5">
        <StarRating value={score} onChange={setScore} disabled={busy} />
        <FormField
          label="Comentário opcional"
          htmlFor="rating-comment"
          hint="Máximo de 500 caracteres. Não inclua dados privados."
        >
          <textarea
            id="rating-comment"
            value={comment}
            maxLength={500}
            disabled={busy}
            onChange={(event) => setComment(event.target.value)}
            className="min-h-28 w-full resize-y rounded-2xl border border-line bg-white p-4 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
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
        <Button className="w-full" disabled={busy || !score} onClick={submit}>
          {busy ? "Enviando..." : "Enviar avaliação"}
        </Button>
      </div>
    </Dialog>
  );
}
