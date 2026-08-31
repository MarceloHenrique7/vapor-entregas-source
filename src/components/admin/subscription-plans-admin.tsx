"use client";

/* eslint-disable react-hooks/set-state-in-effect -- loads administrative plan configuration */

import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Plan {
  id: string;
  role: "MOTOBOY" | "COMPANY";
  name: string;
  description: string;
  monthlyPrice: number;
  active: boolean;
  trialDays: number;
}
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
async function api<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/admin/subscription-plans", init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Falha na operação.");
  return body as T;
}

export function SubscriptionPlansAdmin() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const body = await api<{ plans: Plan[] }>();
      setPlans(body.plans);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: editing.id,
          monthlyPrice: editing.monthlyPrice,
          active: editing.active,
          trialDays: editing.trialDays,
        }),
      });
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };
  const syncProvider = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/subscription-plans/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao sincronizar planos.");
      }
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao sincronizar.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Administração"
        title="Planos e mensalidades"
        description="Valores configuráveis para novas assinaturas. Assinaturas existentes preservam o preço contratado."
      />
      <div className="flex justify-end">
        <Button variant="outline" disabled={busy} onClick={syncProvider}>
          Sincronizar com Mercado Pago
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {!plans ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-60 rounded-3xl" />
          <Skeleton className="h-60 rounded-3xl" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-6">
              <div className="flex justify-between gap-3">
                <div>
                  <Badge variant={plan.active ? "success" : "neutral"}>
                    {plan.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <h2 className="mt-3 font-display text-2xl font-extrabold">
                    {plan.name}
                  </h2>
                </div>
                <p className="font-display text-2xl font-extrabold text-brand">
                  {money.format(plan.monthlyPrice)}
                </p>
              </div>
              <p className="mt-3 text-sm text-muted">{plan.description}</p>
              <p className="mt-3 text-sm">
                Teste grátis:{" "}
                <strong>
                  {plan.trialDays ? `${plan.trialDays} dias` : "desativado"}
                </strong>
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => setEditing({ ...plan })}
              >
                Editar plano
              </Button>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">
            Editar {editing.name}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <FormField label="Mensalidade (R$)" htmlFor="plan-price">
              <Input
                id="plan-price"
                inputMode="decimal"
                value={editing.monthlyPrice}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    monthlyPrice: Number(event.target.value.replace(",", ".")),
                  })
                }
              />
            </FormField>
            <FormField label="Teste grátis (dias)" htmlFor="trial-days">
              <Input
                id="trial-days"
                type="number"
                min={0}
                max={365}
                value={editing.trialDays}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    trialDays: Number(event.target.value),
                  })
                }
              />
            </FormField>
            <label className="flex items-center gap-3 self-end pb-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) =>
                  setEditing({ ...editing, active: event.target.checked })
                }
              />{" "}
              Plano disponível
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={save}>
              {busy ? "Salvando…" : "Salvar e auditar"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
