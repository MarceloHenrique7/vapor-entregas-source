"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  REPORT_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
} from "@/config/reputation";
import type { ReportView } from "@/server/reputation/types";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";

const date = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function ReportsList() {
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      const payload = (await response.json()) as {
        reports?: ReportView[];
        error?: string;
      };
      if (!response.ok || !payload.reports) {
        setError(
          apiErrorMessage(
            response.status,
            payload.error,
            "Não foi possível carregar as denúncias.",
          ),
        );
        return;
      }
      setReports(payload.reports);
      setError("");
    } catch {
      setError(CONNECTION_ERROR);
    }
  }, []);

  useEffect(() => {
    async function loadInitialReports() {
      await load();
    }
    void loadInitialReports();
  }, [load]);

  if (!reports && !error)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!reports)
    return (
      <Card className="p-5 text-sm font-semibold text-red-700">{error}</Card>
    );
  if (reports.length === 0)
    return (
      <Card>
        <EmptyState
          icon="shield"
          title="Nenhuma denúncia registrada"
          description="Problemas relacionados a uma entrega podem ser denunciados pelo histórico."
        />
      </Card>
    );

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">
              {REPORT_STATUS_LABELS[report.status]}
            </Badge>
            <span className="text-xs text-muted">
              {date.format(new Date(report.createdAt))}
            </span>
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold">
            {REPORT_CATEGORY_LABELS[report.category]}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
            {report.description}
          </p>
          <p className="mt-4 text-xs text-muted">
            O status só pode ser alterado pela moderação na etapa
            administrativa.
          </p>
        </Card>
      ))}
    </div>
  );
}
