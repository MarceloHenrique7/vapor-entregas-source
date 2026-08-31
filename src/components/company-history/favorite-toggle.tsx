"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

export function FavoriteToggle({
  initialFavoriteId,
  completedDeliveryId,
  onChange,
}: {
  initialFavoriteId: string | null;
  completedDeliveryId: string;
  onChange?: (favoriteId: string | null) => void;
}) {
  const [favoriteId, setFavoriteId] = useState(initialFavoriteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = favoriteId
        ? await fetch(`/api/favorites/${favoriteId}`, { method: "DELETE" })
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deliveryId: completedDeliveryId }),
          });
      const payload =
        response.status === 204
          ? {}
          : ((await response.json()) as {
              error?: string;
              favorite?: { id: string };
            });
      if (!response.ok) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível atualizar o favorito.",
          ),
        );
        return;
      }
      const next = favoriteId ? null : (payload.favorite?.id ?? null);
      setFavoriteId(next);
      onChange?.(next);
    } catch {
      setError(CONNECTION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="outline" size="sm" disabled={busy} onClick={toggle}>
        {busy
          ? "Salvando..."
          : favoriteId
            ? "Remover dos favoritos"
            : "Favoritar motoboy"}
      </Button>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
