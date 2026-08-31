"use client";

/* eslint-disable react-hooks/set-state-in-effect -- API synchronization updates loading and result state */

import { useCallback, useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { PricingCity, PricingRuleView } from "@/server/pricing/types";

const cityLabels: Record<PricingCity, string> = {
  PETROLINA_PE: "Petrolina/PE",
  JUAZEIRO_BA: "Juazeiro/BA",
};
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "Não foi possível concluir a operação.");
  }
  return body as T;
}

export function PricingRulesAdmin() {
  const [rules, setRules] = useState<PricingRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    city: "PETROLINA_PE" as PricingCity,
    basePrice: "8,00",
    pricePerKm: "2,00",
    minimumPrice: "12,00",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await request<{ rules: PricingRuleView[] }>(
        "/api/admin/pricing-rules",
      );
      setRules(body.rules);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectCurrentRule = (city: PricingCity) => {
    const rule = rules.find((item) => item.city === city && item.enabled);
    setForm({
      city,
      basePrice: (rule?.basePrice ?? 8).toFixed(2).replace(".", ","),
      pricePerKm: (rule?.pricePerKm ?? 2).toFixed(2).replace(".", ","),
      minimumPrice: (rule?.minimumPrice ?? 12).toFixed(2).replace(".", ","),
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const parseMoney = (value: string) => Number(value.replace(",", "."));
    try {
      await request("/api/admin/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: form.city,
          basePrice: parseMoney(form.basePrice),
          pricePerKm: parseMoney(form.pricePerKm),
          minimumPrice: parseMoney(form.minimumPrice),
        }),
      });
      setSuccess(
        `Nova regra de ${cityLabels[form.city]} ativada. Entregas existentes não foram alteradas.`,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Administração"
        title="Preço sugerido"
        description="Configure uma referência não vinculante por cidade. O valor final continua sendo informado pela empresa e combinado diretamente com o motoboy."
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(cityLabels) as PricingCity[]).map((city) => {
            const rule = rules.find(
              (item) => item.city === city && item.enabled,
            );
            return (
              <Card key={city} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-950">
                      {cityLabels[city]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {rule
                        ? `Ativa desde ${dateTime.format(new Date(rule.activeFrom))}`
                        : "Nenhuma regra ativa"}
                    </p>
                  </div>
                  <Badge variant={rule ? "success" : "neutral"}>
                    {rule ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {rule && (
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Base</dt>
                      <dd className="font-bold">
                        {currency.format(rule.basePrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Por km</dt>
                      <dd className="font-bold">
                        {currency.format(rule.pricePerKm)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Mínimo</dt>
                      <dd className="font-bold">
                        {currency.format(rule.minimumPrice)}
                      </dd>
                    </div>
                  </dl>
                )}
                <Button
                  variant="outline"
                  onClick={() => selectCurrentRule(city)}
                >
                  Editar esta cidade
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Nova versão da regra
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              A regra anterior é encerrada e preservada no histórico. Valores já
              aceitos nunca são recalculados.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Cidade" htmlFor="pricing-city">
              <Select
                id="pricing-city"
                value={form.city}
                onChange={(event) =>
                  selectCurrentRule(event.target.value as PricingCity)
                }
              >
                {(Object.keys(cityLabels) as PricingCity[]).map((city) => (
                  <option key={city} value={city}>
                    {cityLabels[city]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Preço-base (R$)" htmlFor="pricing-base">
              <Input
                id="pricing-base"
                inputMode="decimal"
                value={form.basePrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    basePrice: event.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Preço por km (R$)" htmlFor="pricing-km">
              <Input
                id="pricing-km"
                inputMode="decimal"
                value={form.pricePerKm}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pricePerKm: event.target.value,
                  }))
                }
                required
              />
            </FormField>
            <FormField label="Preço mínimo (R$)" htmlFor="pricing-minimum">
              <Input
                id="pricing-minimum"
                inputMode="decimal"
                value={form.minimumPrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minimumPrice: event.target.value,
                  }))
                }
                required
              />
            </FormField>
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm font-semibold text-emerald-700">
              {success}
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Ativando…" : "Ativar nova regra"}
          </Button>
        </form>
      </Card>

      <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <strong>Referência provisória:</strong> a distância usada nesta versão é
        em linha reta, não distância viária. A empresa pode ajustar livremente o
        valor final antes de publicar.
      </Card>
    </div>
  );
}
