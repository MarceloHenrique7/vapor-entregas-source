"use client";

import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { ManualFreightQuote } from "@/server/pricing/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCents = (value: number) => money.format(value / 100);

export function FreightCalculator() {
  const [distance, setDistance] = useState("");
  const [additional, setAdditional] = useState("");
  const [quote, setQuote] = useState<ManualFreightQuote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setQuote(null);
    try {
      const parsedDistance = Number(distance.replace(",", "."));
      const parsedAdditional = additional
        ? Math.round(Number(additional.replace(",", ".")) * 100)
        : 0;
      const response = await fetch("/api/company/freight-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceKm: parsedDistance,
          additionalCents: parsedAdditional,
        }),
      });
      const payload = (await response.json()) as {
        quote?: ManualFreightQuote;
        error?: string;
      };
      if (!response.ok || !payload.quote) {
        setError(payload.error ?? "Não foi possível calcular agora.");
        return;
      }
      setQuote(payload.quote);
    } catch {
      setError(
        "Não foi possível conectar. Confira sua internet e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.8fr)]">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              Distância da rota
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              Consulte a rota no seu aplicativo de mapas e informe a distância
              rodoviária exibida. Ela ficará identificada como manual.
            </p>
          </div>
          <Badge variant="info">Fonte manual</Badge>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <FormField
            htmlFor="distanceKm"
            label="Distância rodoviária (km)"
            hint="Aceita casas decimais, por exemplo 8,7 km."
            required
          >
            <Input
              id="distanceKm"
              inputMode="decimal"
              placeholder="Ex.: 8,7"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              required
            />
          </FormField>
          <FormField
            htmlFor="additional"
            label="Adicionais previstos (opcional)"
            hint="Informe somente valores já conhecidos. O cálculo não cria cobrança."
          >
            <Input
              id="additional"
              inputMode="decimal"
              placeholder="Ex.: 5,00"
              value={additional}
              onChange={(event) => setAdditional(event.target.value)}
            />
          </FormField>
          {error && (
            <p
              className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Calculando…" : "Calcular estimativa"}
          </Button>
        </form>
      </Card>

      <Card className="p-5 sm:p-7" aria-live="polite">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">
          Estimativa
        </p>
        {quote ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm text-muted">Valor estimado total</p>
              <p className="mt-1 font-display text-4xl font-black text-ink">
                {formatCents(quote.totalEstimateCents)}
              </p>
            </div>
            <dl className="divide-y divide-line rounded-2xl bg-canvas px-4">
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-muted">Distância informada</dt>
                <dd className="font-bold">
                  {quote.distanceKm.toLocaleString("pt-BR")} km
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-muted">Estimativa da corrida</dt>
                <dd className="font-bold">
                  {formatCents(quote.suggestedPriceCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-muted">Adicionais informados</dt>
                <dd className="font-bold">
                  {formatCents(quote.additionalCents)}
                </dd>
              </div>
            </dl>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {quote.notice}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line p-6 text-sm leading-6 text-muted">
            O resultado aparecerá aqui usando a regra ativa da sua cidade. A
            tabela pode ser atualizada pela administração sem alterar esta tela.
          </div>
        )}
      </Card>
    </div>
  );
}
