"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { CompanyLocationMapLoader } from "@/components/maps/company-location-map-loader";
import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DELIVERY_EXTRAS_NOTICE,
  DELIVERY_EXTRA_TYPE_LABELS,
  DIRECT_PAYMENT_NOTICE,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import {
  calculateStraightLineDistance,
  type Coordinates,
} from "@/lib/maps/geo";

type City = "PETROLINA_PE" | "JUAZEIRO_BA";
type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;
type ExtraType = keyof typeof DELIVERY_EXTRA_TYPE_LABELS;

interface PlannedExtra {
  type: ExtraType;
  enabled: boolean;
  description: string;
  amount: string;
  note: string;
}

interface DeliveryQuote {
  distanceEstimateKm: number;
  distanceMethod: "STRAIGHT_LINE" | "GOOGLE_ROUTES";
  routeDurationSeconds: number | null;
  distanceLabel: string;
  suggestedPrice: number | null;
  pricingRuleId: string | null;
}

export interface PickupSummary {
  companyName: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  city: City;
  state: string;
  latitude: number;
  longitude: number;
}

interface RepeatDeliveryDraft {
  id: string;
  pickupAddress: string;
  pickupNumber: string;
  pickupNeighborhood: string;
  destinationAddress: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationComplement: string | null;
  destinationReference: string | null;
  destinationCity: City;
  destinationState: string;
  destinationPostalCode: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
  offeredPrice: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  extras?: Array<{
    type: ExtraType;
    description: string;
    amount: number | null;
    note: string | null;
  }>;
}

const initialExtras: PlannedExtra[] = (
  Object.keys(DELIVERY_EXTRA_TYPE_LABELS) as ExtraType[]
).map((type) => ({
  type,
  enabled: false,
  description: DELIVERY_EXTRA_TYPE_LABELS[type],
  amount: "",
  note: "",
}));

const cityCenters: Record<City, Coordinates> = {
  PETROLINA_PE: { latitude: -9.3891, longitude: -40.5031 },
  JUAZEIRO_BA: { latitude: -9.4162, longitude: -40.5033 },
};

export function NewDeliveryForm({
  pickup,
  repeatDeliveryId,
}: {
  pickup: PickupSummary;
  repeatDeliveryId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    destinationAddress: "",
    destinationNumber: "",
    destinationNeighborhood: "",
    destinationComplement: "",
    destinationReference: "",
    destinationCity: pickup.city,
    destinationState: pickup.city === "PETROLINA_PE" ? "PE" : "BA",
    destinationPostalCode: "",
    offeredPrice: "",
    paymentMethod: "PIX" as PaymentMethod,
    notes: "",
  });
  const [coordinates, setCoordinates] = useState<Coordinates>(
    cityCenters[pickup.city],
  );
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "publishing">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [approximateAddress, setApproximateAddress] = useState("");
  const [repeatSource, setRepeatSource] = useState<RepeatDeliveryDraft | null>(
    null,
  );
  const [extras, setExtras] = useState<PlannedExtra[]>(initialExtras);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const distance = useMemo(
    () =>
      calculateStraightLineDistance(
        { latitude: pickup.latitude, longitude: pickup.longitude },
        coordinates,
      ),
    [coordinates, pickup.latitude, pickup.longitude],
  );

  useEffect(() => {
    if (!pinConfirmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a quote invalidated by a changed PIN
      setQuote(null);
      setQuoteError("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError("");
      try {
        const response = await fetch("/api/deliveries/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            destinationLatitude: coordinates.latitude,
            destinationLongitude: coordinates.longitude,
            destinationCity: form.destinationCity,
          }),
        });
        const payload = (await response.json()) as {
          quote?: DeliveryQuote;
          error?: string;
        };
        if (!response.ok || !payload.quote) {
          setQuoteError(
            payload.error ?? "A sugestão de valor está indisponível.",
          );
          return;
        }
        setQuote(payload.quote);
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setQuoteError("A sugestão de valor está indisponível.");
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [coordinates, form.destinationCity, pinConfirmed]);

  useEffect(() => {
    if (!repeatDeliveryId) return;
    let active = true;
    async function loadDraft() {
      setStatus("searching");
      try {
        const response = await fetch(
          `/api/company/history/${repeatDeliveryId}/repeat`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          draft?: RepeatDeliveryDraft;
          error?: string;
        };
        if (!response.ok || !payload.draft) {
          if (active)
            setMessage(
              payload.error ?? "Não foi possível carregar o rascunho.",
            );
          return;
        }
        if (!active) return;
        const draft = payload.draft;
        setRepeatSource(draft);
        setForm({
          destinationAddress: draft.destinationAddress,
          destinationNumber: draft.destinationNumber,
          destinationNeighborhood: draft.destinationNeighborhood,
          destinationComplement: draft.destinationComplement ?? "",
          destinationReference: draft.destinationReference ?? "",
          destinationCity: draft.destinationCity,
          destinationState: draft.destinationState,
          destinationPostalCode: draft.destinationPostalCode ?? "",
          offeredPrice: String(draft.offeredPrice).replace(".", ","),
          paymentMethod: draft.paymentMethod,
          notes: draft.notes ?? "",
        });
        setCoordinates({
          latitude: draft.destinationLatitude,
          longitude: draft.destinationLongitude,
        });
        setPinConfirmed(true);
        setExtras(
          initialExtras.map((row) => {
            const copied = draft.extras?.find(
              (extra) => extra.type === row.type,
            );
            return copied
              ? {
                  type: row.type,
                  enabled: true,
                  description: copied.description,
                  amount:
                    copied.amount === null
                      ? ""
                      : String(copied.amount).replace(".", ","),
                  note: copied.note ?? "",
                }
              : row;
          }),
        );
        setMessage(
          "Rascunho preenchido. Revise endereço, PIN, valor e observações antes de publicar.",
        );
      } catch {
        if (active) setMessage("Erro de conexão ao carregar o rascunho.");
      } finally {
        if (active) setStatus("idle");
      }
    }
    void loadDraft();
    return () => {
      active = false;
    };
  }, [repeatDeliveryId]);

  function updateExtra(
    type: ExtraType,
    values: Partial<Omit<PlannedExtra, "type">>,
  ) {
    setExtras((current) =>
      current.map((extra) =>
        extra.type === type ? { ...extra, ...values } : extra,
      ),
    );
    setMessage("");
  }

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function chooseCity(city: City) {
    setForm((current) => ({
      ...current,
      destinationCity: city,
      destinationState: city === "PETROLINA_PE" ? "PE" : "BA",
    }));
    setCoordinates(cityCenters[city]);
    setPinConfirmed(false);
  }

  function hasRequiredAddress() {
    if (
      !form.destinationAddress.trim() ||
      !form.destinationNumber.trim() ||
      !form.destinationNeighborhood.trim()
    ) {
      setMessage("Preencha rua, número e bairro do destino.");
      return false;
    }
    return true;
  }

  async function locateDestination() {
    if (!hasRequiredAddress()) return;
    setStatus("searching");
    setMessage("");
    try {
      const response = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.destinationAddress,
          number: form.destinationNumber,
          neighborhood: form.destinationNeighborhood,
          city: form.destinationCity,
          state: form.destinationState,
          postalCode: form.destinationPostalCode,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: Coordinates & { displayName: string };
      };
      if (!response.ok || !payload.result) {
        setMessage(
          payload.error ?? "Destino não encontrado. Ajuste o PIN manualmente.",
        );
        return;
      }
      setCoordinates(payload.result);
      setPinConfirmed(true);
      setApproximateAddress(payload.result.displayName);
    } catch {
      setMessage("Busca indisponível. Ajuste o PIN manualmente.");
    } finally {
      setStatus("idle");
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!hasRequiredAddress()) return;
    if (!pinConfirmed) {
      setMessage(
        "Localize o destino e confirme o PIN no mapa antes de publicar.",
      );
      return;
    }
    setStatus("publishing");
    setMessage("");
    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          offeredPrice: Number(form.offeredPrice.replace(",", ".")),
          destinationLatitude: coordinates.latitude,
          destinationLongitude: coordinates.longitude,
          extras: extras
            .filter((extra) => extra.enabled)
            .map((extra) => ({
              type: extra.type,
              description: extra.description,
              ...(extra.amount
                ? { amount: Number(extra.amount.replace(",", ".")) }
                : {}),
              ...(extra.note ? { note: extra.note } : {}),
            })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(
          payload.error ?? "Não foi possível publicar a oportunidade.",
        );
        return;
      }
      router.push("/app/empresa/entregas");
      router.refresh();
    } catch {
      setMessage("Erro de rede ao publicar. Tente novamente.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={publish} className="grid gap-6 xl:grid-cols-[1fr_.82fr]">
      <div className="space-y-6">
        {repeatSource && (
          <Card className="border-brand/25 bg-brand-light/35 p-5 text-sm">
            <p className="font-bold text-brand-dark">
              Rascunho baseado em uma entrega anterior
            </p>
            <p className="mt-2 text-muted">
              A coleta atual continua sendo o ponto padrão da empresa. Na
              entrega original era {repeatSource.pickupAddress},{" "}
              {repeatSource.pickupNumber} · {repeatSource.pickupNeighborhood}.
              Nada será publicado sem sua confirmação.
            </p>
          </Card>
        )}
        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            1 · Coleta
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold">
            {pickup.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {pickup.address}, {pickup.number} · {pickup.neighborhood} —{" "}
            {pickup.state}
          </p>
          <p className="mt-3 text-xs text-muted">
            O ponto padrão confirmado foi carregado automaticamente.
          </p>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            Condições especiais
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold">
            Adicionais conhecidos antes da publicação
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Informe tudo que possa mudar a execução. O motoboy verá estas
            condições antes de decidir se aceita.
          </p>
          <div className="mt-5 space-y-4">
            {extras.map((extra) => (
              <div
                key={extra.type}
                className="rounded-2xl border border-line p-4"
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-brand"
                    checked={extra.enabled}
                    onChange={(event) =>
                      updateExtra(extra.type, { enabled: event.target.checked })
                    }
                  />
                  <span>{DELIVERY_EXTRA_TYPE_LABELS[extra.type]}</span>
                </label>
                {extra.enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="Descrição"
                      htmlFor={`extra-description-${extra.type}`}
                      required
                    >
                      <Input
                        id={`extra-description-${extra.type}`}
                        maxLength={240}
                        value={extra.description}
                        onChange={(event) =>
                          updateExtra(extra.type, {
                            description: event.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label="Valor adicional informado"
                      htmlFor={`extra-amount-${extra.type}`}
                      hint="Opcional · pagamento direto"
                    >
                      <Input
                        id={`extra-amount-${extra.type}`}
                        inputMode="decimal"
                        placeholder="Ex.: 5,00"
                        value={extra.amount}
                        onChange={(event) =>
                          updateExtra(extra.type, {
                            amount: event.target.value,
                          })
                        }
                      />
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField
                        label="Observação do adicional"
                        htmlFor={`extra-note-${extra.type}`}
                        hint="Opcional"
                      >
                        <Input
                          id={`extra-note-${extra.type}`}
                          maxLength={300}
                          value={extra.note}
                          onChange={(event) =>
                            updateExtra(extra.type, {
                              note: event.target.value,
                            })
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            {DELIVERY_EXTRAS_NOTICE}
          </p>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            2 · Destino
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField
              label="CEP"
              htmlFor="destinationPostalCode"
              hint="Opcional"
            >
              <Input
                id="destinationPostalCode"
                inputMode="numeric"
                value={form.destinationPostalCode}
                onChange={(event) =>
                  update("destinationPostalCode", event.target.value)
                }
              />
            </FormField>
            <FormField label="Cidade" htmlFor="destinationCity" required>
              <Select
                id="destinationCity"
                value={form.destinationCity}
                onChange={(event) => chooseCity(event.target.value as City)}
              >
                <option value="PETROLINA_PE">Petrolina / PE</option>
                <option value="JUAZEIRO_BA">Juazeiro / BA</option>
              </Select>
            </FormField>
            <FormField label="Rua" htmlFor="destinationAddress" required>
              <Input
                id="destinationAddress"
                value={form.destinationAddress}
                onChange={(event) =>
                  update("destinationAddress", event.target.value)
                }
              />
            </FormField>
            <FormField label="Número" htmlFor="destinationNumber" required>
              <Input
                id="destinationNumber"
                value={form.destinationNumber}
                onChange={(event) =>
                  update("destinationNumber", event.target.value)
                }
              />
            </FormField>
            <FormField
              label="Bairro"
              htmlFor="destinationNeighborhood"
              required
            >
              <Input
                id="destinationNeighborhood"
                value={form.destinationNeighborhood}
                onChange={(event) =>
                  update("destinationNeighborhood", event.target.value)
                }
              />
            </FormField>
            <FormField
              label="Complemento"
              htmlFor="destinationComplement"
              hint="Opcional"
            >
              <Input
                id="destinationComplement"
                value={form.destinationComplement}
                onChange={(event) =>
                  update("destinationComplement", event.target.value)
                }
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label="Ponto de referência"
                htmlFor="destinationReference"
                hint="Opcional"
              >
                <Input
                  id="destinationReference"
                  value={form.destinationReference}
                  onChange={(event) =>
                    update("destinationReference", event.target.value)
                  }
                />
              </FormField>
            </div>
          </div>
          <Button
            className="mt-6 w-full sm:w-auto"
            variant="outline"
            onClick={locateDestination}
            disabled={status !== "idle"}
          >
            <Icon name="map" className="size-5" />
            {status === "searching"
              ? "Buscando destino..."
              : "Localizar destino"}
          </Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 sm:p-7">
            <h2 className="font-display text-xl font-extrabold">
              Confirme o destino no mapa
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clique no mapa ou arraste o PIN até a entrada correta do destino.
            </p>
            {approximateAddress && (
              <p className="mt-3 text-xs text-muted">
                Endereço aproximado: {approximateAddress}
              </p>
            )}
          </div>
          <div className="h-[25rem] border-y border-line bg-[#f3eeee] sm:h-[30rem]">
            <CompanyLocationMapLoader
              coordinates={coordinates}
              onChange={(next) => {
                setCoordinates(next);
                setPinConfirmed(true);
              }}
              onTileError={() =>
                setMessage("Alguns blocos do mapa não carregaram.")
              }
            />
          </div>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            3 · Oferta
          </p>
          <div className="mt-5 space-y-5">
            <FormField
              label="Valor oferecido"
              htmlFor="offeredPrice"
              required
              hint="O pagamento será feito diretamente ao motoboy."
            >
              <Input
                id="offeredPrice"
                inputMode="decimal"
                placeholder="Ex.: 18,00"
                value={form.offeredPrice}
                onChange={(event) => update("offeredPrice", event.target.value)}
              />
            </FormField>
            <div className="rounded-2xl border border-brand/20 bg-brand-light/35 p-4 text-sm">
              <p className="font-bold text-brand-dark">
                Sugestão Vapor Entregas
              </p>
              {quoteLoading ? (
                <p className="mt-2 text-muted">Calculando sugestão...</p>
              ) : quote?.suggestedPrice !== null && quote ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-extrabold">
                      R${" "}
                      {quote.suggestedPrice.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Referência configurável; você confirma o valor final.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update(
                        "offeredPrice",
                        quote.suggestedPrice!.toFixed(2).replace(".", ","),
                      )
                    }
                  >
                    Usar sugestão
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-muted">
                  {quoteError ||
                    "Confirme o PIN para consultar a regra vigente."}
                </p>
              )}
            </div>
            <FormField
              label="Forma de pagamento"
              htmlFor="paymentMethod"
              required
            >
              <Select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(event) =>
                  update("paymentMethod", event.target.value)
                }
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Observações"
              htmlFor="notes"
              hint="Opcional · até 500 caracteres"
            >
              <textarea
                id="notes"
                maxLength={500}
                className="min-h-28 w-full rounded-2xl border border-line bg-white p-4 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
              />
            </FormField>
          </div>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            Resumo antes de publicar
          </p>
          <h2 className="mt-3 font-display text-xl font-extrabold">
            {pickup.companyName}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-muted">Coleta</dt>
              <dd className="mt-1 text-ink">{pickup.neighborhood}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Destino</dt>
              <dd className="mt-1 text-ink">
                {form.destinationNeighborhood || "Informe o bairro"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Distância estimada</dt>
              <dd className="mt-1 text-ink">
                {pinConfirmed
                  ? `${(quote?.distanceEstimateKm ?? distance).toFixed(1).replace(".", ",")} km${quote?.routeDurationSeconds ? ` · ~${Math.max(1, Math.ceil(quote.routeDurationSeconds / 60))} min` : ""}`
                  : "Confirme o PIN"}
              </dd>
              {pinConfirmed && (
                <p className="mt-1 text-xs text-muted">
                  {quote?.distanceLabel ??
                    "Prévia geográfica; não representa distância viária."}
                </p>
              )}
            </div>
            <div>
              <dt className="font-bold text-muted">Valor sugerido</dt>
              <dd className="mt-1 text-ink">
                {quote?.suggestedPrice === null || !quote
                  ? "Regra indisponível"
                  : `R$ ${quote.suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Valor</dt>
              <dd className="mt-1 text-ink">
                {form.offeredPrice
                  ? `R$ ${form.offeredPrice}`
                  : "Informe o valor"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Pagamento</dt>
              <dd className="mt-1 text-ink">
                {PAYMENT_METHOD_LABELS[form.paymentMethod]}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Adicionais</dt>
              <dd className="mt-1 text-ink">
                {extras.filter((extra) => extra.enabled).length || "Nenhum"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 rounded-2xl bg-brand-light/60 p-4 text-xs leading-5 text-brand-dark">
            {DIRECT_PAYMENT_NOTICE}
          </p>
          {message && (
            <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
              {message}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={status !== "idle" || !form.offeredPrice || !pinConfirmed}
          >
            <Icon name="package" className="size-5" />
            {status === "publishing"
              ? "Publicando..."
              : "Publicar oportunidade"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
