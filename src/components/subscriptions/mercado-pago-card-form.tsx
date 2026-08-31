"use client";

import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CardFormData = {
  token?: string | null;
};

type CardFormController = {
  getCardFormData(): CardFormData;
  unmount?: () => void;
};

type MercadoPagoInstance = {
  cardForm(configuration: {
    amount: string;
    iframe: true;
    form: {
      id: string;
      cardNumber: { id: string; placeholder: string };
      expirationDate: { id: string; placeholder: string };
      securityCode: { id: string; placeholder: string };
      cardholderName: { id: string; placeholder: string };
      issuer: { id: string; placeholder: string };
      installments: { id: string; placeholder: string };
      identificationType: { id: string; placeholder: string };
      identificationNumber: { id: string; placeholder: string };
      cardholderEmail: { id: string; placeholder: string };
    };
    callbacks: {
      onFormMounted(error?: unknown): void;
      onSubmit(event: SubmitEvent): Promise<void>;
      onFetching(): () => void;
    };
  }): CardFormController;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options: { locale: "pt-BR" },
    ) => MercadoPagoInstance;
  }
}

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
const secureFieldClass =
  "h-12 w-full overflow-hidden rounded-2xl border border-line bg-white px-4 py-3 shadow-sm transition hover:border-brand/35 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10";

export function MercadoPagoCardForm({
  amount,
  trialDays,
  disabled,
  onToken,
}: {
  amount: number;
  trialDays: number;
  disabled: boolean;
  onToken: (cardTokenId: string) => Promise<boolean>;
}) {
  const [ready, setReady] = useState(false);
  const [tokenizing, setTokenizing] = useState(false);
  const [error, setError] = useState("");
  const tokenizingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let cardForm: CardFormController | null = null;

    async function mountCardForm() {
      if (!publicKey) {
        setError(
          "A chave pública do Mercado Pago não foi configurada neste ambiente.",
        );
        return;
      }
      try {
        await loadMercadoPago();
        if (!active || !window.MercadoPago) return;
        const mercadoPago = new window.MercadoPago(publicKey, {
          locale: "pt-BR",
        });
        cardForm = mercadoPago.cardForm({
          amount: amount.toFixed(2),
          iframe: true,
          form: {
            id: "subscription-card-form",
            cardNumber: {
              id: "subscription-card-number",
              placeholder: "Número do cartão",
            },
            expirationDate: {
              id: "subscription-card-expiration",
              placeholder: "MM/AA",
            },
            securityCode: {
              id: "subscription-card-security-code",
              placeholder: "CVV",
            },
            cardholderName: {
              id: "subscription-cardholder-name",
              placeholder: "Nome impresso no cartão",
            },
            issuer: {
              id: "subscription-card-issuer",
              placeholder: "Banco emissor",
            },
            installments: {
              id: "subscription-card-installments",
              placeholder: "Parcelas",
            },
            identificationType: {
              id: "subscription-card-identification-type",
              placeholder: "Tipo de documento",
            },
            identificationNumber: {
              id: "subscription-card-identification-number",
              placeholder: "Número do documento",
            },
            cardholderEmail: {
              id: "subscription-cardholder-email",
              placeholder: "E-mail do titular",
            },
          },
          callbacks: {
            onFormMounted(mountError) {
              if (!active) return;
              if (mountError) {
                setError(
                  "Não foi possível carregar o formulário seguro do Mercado Pago.",
                );
                return;
              }
              setReady(true);
            },
            async onSubmit(event) {
              event.preventDefault();
              if (!cardForm || tokenizingRef.current) return;
              tokenizingRef.current = true;
              setTokenizing(true);
              setError("");
              try {
                const cardTokenId = cardForm.getCardFormData().token?.trim();
                if (!cardTokenId) {
                  setError("Revise os dados do cartão e tente novamente.");
                  return;
                }
                const completed = await onToken(cardTokenId);
                if (!completed) {
                  setError(
                    "Não foi possível autorizar o cartão. Revise os dados ou tente outro cartão.",
                  );
                }
              } catch {
                if (active) {
                  setError(
                    "Não foi possível autorizar o cartão. Revise os dados ou tente outro cartão.",
                  );
                }
              } finally {
                tokenizingRef.current = false;
                if (active) setTokenizing(false);
              }
            },
            onFetching() {
              if (active) setTokenizing(true);
              return () => {
                if (active) setTokenizing(false);
              };
            },
          },
        });
      } catch {
        if (active) {
          setError(
            "Não foi possível carregar o formulário seguro do Mercado Pago.",
          );
        }
      }
    }

    void mountCardForm();
    return () => {
      active = false;
      cardForm?.unmount?.();
    };
  }, [amount, onToken]);

  return (
    <form
      id="subscription-card-form"
      className="max-h-[72dvh] space-y-4 overflow-y-auto pr-1"
    >
      <div className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        {trialDays > 0
          ? `Seu cartão será validado agora. A cobrança mensal começa após o teste grátis de ${trialDays} dias.`
          : "Seu cartão será tokenizado pelo Mercado Pago para autorizar a cobrança mensal recorrente."}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-bold text-ink-soft">
          Número do cartão
        </span>
        <div id="subscription-card-number" className={secureFieldClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-bold text-ink-soft">Validade</span>
          <div id="subscription-card-expiration" className={secureFieldClass} />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-bold text-ink-soft">
            Código de segurança
          </span>
          <div
            id="subscription-card-security-code"
            className={secureFieldClass}
          />
        </div>
      </div>

      <FormField label="Nome do titular" htmlFor="subscription-cardholder-name">
        <Input id="subscription-cardholder-name" autoComplete="cc-name" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Tipo de documento"
          htmlFor="subscription-card-identification-type"
        >
          <Select id="subscription-card-identification-type" />
        </FormField>
        <FormField
          label="Número do documento"
          htmlFor="subscription-card-identification-number"
        >
          <Input
            id="subscription-card-identification-number"
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>
      </div>

      <FormField
        label="E-mail do titular"
        htmlFor="subscription-cardholder-email"
        hint="O e-mail da assinatura é confirmado pelo servidor a partir da sua conta."
      >
        <Input
          id="subscription-cardholder-email"
          type="email"
          autoComplete="email"
        />
      </FormField>

      <FormField label="Banco emissor" htmlFor="subscription-card-issuer">
        <Select id="subscription-card-issuer" />
      </FormField>
      <Select
        id="subscription-card-installments"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      <Button
        id="subscription-card-submit"
        type="submit"
        className="w-full"
        disabled={!ready || tokenizing || disabled || !publicKey}
      >
        {tokenizing ? "Autorizando…" : "Autorizar assinatura"}
      </Button>
      <p className="text-center text-xs leading-5 text-muted">
        Os dados completos do cartão são enviados diretamente ao Mercado Pago e
        não são armazenados pela Vapor Entregas.
      </p>
    </form>
  );
}
