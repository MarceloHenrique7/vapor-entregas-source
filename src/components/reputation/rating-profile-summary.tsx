"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RatingOverview } from "@/server/reputation/types";

export function RatingProfileSummary() {
  const [overview, setOverview] = useState<RatingOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/ratings", { cache: "no-store" });
        const payload = (await response.json()) as RatingOverview & {
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error ?? "Não foi possível carregar sua avaliação.");
          return;
        }
        setOverview(payload);
      } catch {
        setError("Erro de rede ao carregar sua avaliação.");
      }
    }
    void load();
  }, []);

  if (!overview && !error) return <Skeleton className="h-52 w-full" />;
  if (!overview)
    return (
      <Card className="p-5 text-sm font-semibold text-red-700">{error}</Card>
    );
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[.16em] text-brand">
        Avaliações recebidas
      </p>
      <p className="mt-3 font-display text-5xl font-extrabold">
        {overview.received.average === null
          ? "—"
          : overview.received.average.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
        <span className="ml-2 text-3xl text-sun">★</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        {overview.received.count}{" "}
        {overview.received.count === 1 ? "avaliação" : "avaliações"}
      </p>
      <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
        A média é calculada no servidor. Comentários recebidos não são
        publicados no MVP.
      </p>
    </Card>
  );
}
