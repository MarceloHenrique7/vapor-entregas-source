import { Badge } from "@/components/ui/badge";
import {
  DELIVERY_EXTRAS_NOTICE,
  DELIVERY_EXTRA_STATUS_LABELS,
  DELIVERY_EXTRA_TYPE_LABELS,
} from "@/config/delivery";
import type { DeliveryExtraView } from "@/server/deliveries/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function DeliveryExtrasSummary({
  extras,
  showHistory = false,
}: {
  extras?: DeliveryExtraView[];
  showHistory?: boolean;
}) {
  if (!extras?.length) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <h3 className="font-display text-lg font-extrabold text-amber-950">
        Condições e adicionais informados
      </h3>
      <div className="mt-4 space-y-3">
        {extras.map((extra) => (
          <article key={extra.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">
                {DELIVERY_EXTRA_TYPE_LABELS[extra.type]}
              </Badge>
              <Badge
                variant={
                  extra.status === "ACKNOWLEDGED" ? "success" : "neutral"
                }
              >
                {DELIVERY_EXTRA_STATUS_LABELS[extra.status]}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-bold">{extra.description}</p>
            <p className="mt-1 text-sm text-muted">
              {extra.amount === null
                ? "Sem valor adicional definido"
                : `${currency.format(extra.amount)} · pagamento direto`}
              {` · informado por ${extra.informedByRole === "COMPANY" ? "empresa" : "motoboy"}`}
            </p>
            {extra.note && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                {extra.note}
              </p>
            )}
            {showHistory && extra.history.length > 0 && (
              <ol className="mt-3 space-y-2 border-l border-line pl-4 text-xs text-muted">
                {extra.history.map((event) => (
                  <li key={event.id}>
                    {DELIVERY_EXTRA_STATUS_LABELS[event.newStatus]} ·{" "}
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                    {event.note ? ` — ${event.note}` : ""}
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-amber-900">
        {DELIVERY_EXTRAS_NOTICE}
      </p>
    </section>
  );
}
