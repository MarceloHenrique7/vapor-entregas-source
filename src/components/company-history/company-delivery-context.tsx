"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DELIVERY_STATUS_LABELS } from "@/config/delivery";
import { apiErrorMessage, CONNECTION_ERROR } from "@/lib/http/client-error";
import type { DeliveryStatus } from "@/server/deliveries/types";

interface Detail {
  id: string;
  motoboyId: string | null;
  motoboyName: string | null;
  notes: string | null;
  companyRating: number | null;
  motoboyRating: number | null;
  timeline: Array<{
    id: string;
    newStatus: DeliveryStatus;
    actorRole: string | null;
    note: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    category: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
}

export function CompanyDeliveryContext({ deliveryId }: { deliveryId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/company/history/${deliveryId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          detail?: Detail;
          error?: string;
        };
        if (!response.ok || !payload.detail) {
          setError(
            apiErrorMessage(
              response.status,
              payload.error,
              "Não foi possível carregar os dados históricos.",
            ),
          );
          return;
        }
        setDetail(payload.detail);
      } catch {
        setError(CONNECTION_ERROR);
      }
    }
    void load();
  }, [deliveryId]);

  if (error)
    return (
      <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
        {error}
      </Card>
    );
  if (!detail)
    return (
      <Card className="p-5 text-sm text-muted">
        Carregando contexto histórico...
      </Card>
    );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-extrabold">
          Registro e relacionamento
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-bold text-muted">Motoboy responsável</dt>
            <dd>{detail.motoboyName ?? "Não vinculado"}</dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Sua avaliação</dt>
            <dd>
              {detail.companyRating === null
                ? "Ainda não enviada"
                : `${detail.companyRating} ★`}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Avaliação recebida</dt>
            <dd>
              {detail.motoboyRating === null
                ? "Ainda não recebida"
                : `${detail.motoboyRating} ★`}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-muted">Observações da entrega</dt>
            <dd className="whitespace-pre-wrap">
              {detail.notes ?? "Nenhuma observação."}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/app/empresa/entregas/nova?repetir=${detail.id}`}
            className={buttonStyles({ size: "sm" })}
          >
            Repetir como rascunho
          </Link>
          {detail.motoboyId && (
            <Link
              href={`/app/empresa/motoboys/${detail.motoboyId}`}
              className={buttonStyles({ variant: "outline", size: "sm" })}
            >
              Histórico com motoboy
            </Link>
          )}
        </div>
      </Card>
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-extrabold">
          Timeline completa
        </h2>
        <ol className="mt-4 space-y-4 border-l-2 border-brand-light pl-5">
          {detail.timeline.map((event) => (
            <li key={event.id}>
              <Badge
                variant={
                  event.newStatus === "COMPLETED" ? "success" : "neutral"
                }
              >
                {DELIVERY_STATUS_LABELS[event.newStatus]}
              </Badge>
              <p className="mt-1 text-xs text-muted">
                {new Date(event.createdAt).toLocaleString("pt-BR")} ·{" "}
                {event.actorRole ?? "Sistema"}
              </p>
              {event.note && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{event.note}</p>
              )}
            </li>
          ))}
        </ol>
      </Card>
      {detail.reports.length > 0 && (
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-extrabold">
            Denúncias abertas por sua empresa
          </h2>
          <div className="mt-4 space-y-3">
            {detail.reports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-canvas p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{report.status}</Badge>
                  <span className="text-xs text-muted">
                    {new Date(report.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold">{report.category}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                  {report.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
