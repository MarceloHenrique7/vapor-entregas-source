"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim();
if (publicKey) initMercadoPago(publicKey, { locale: "pt-BR" });

type PaymentSubmission = Parameters<
  ComponentProps<typeof Payment>["onSubmit"]
>[0];

export type AccessPaymentView = {
  id: string;
  status:
    | "CREATED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "REFUNDED"
    | "EXPIRED"
    | "ERROR";
  paymentMethod: string | null;
  amount: number;
  currency: string;
  paidAt: string | null;
  expiresAt: string | null;
  pix: {
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
  } | null;
};

type CheckoutResponse = {
  payment: AccessPaymentView;
  subscription: unknown;
};

function safeSubmission(submission: PaymentSubmission) {
  const data = submission.formData;
  return {
    attemptId: crypto.randomUUID(),
    selectedPaymentMethod: submission.selectedPaymentMethod,
    formData: {
      payment_method_id: data.payment_method_id,
      token: data.token || undefined,
      issuer_id: data.issuer_id || undefined,
      installments: data.installments || undefined,
      transaction_amount: data.transaction_amount,
      payer: data.payer
        ? {
            email: data.payer.email,
            identification: data.payer.identification,
          }
        : undefined,
    },
  };
}

export function MercadoPagoPaymentBrick({
  amount,
  payerEmail,
  onPayment,
}: {
  amount: number;
  payerEmail: string;
  onPayment(result: AccessPaymentView): void | Promise<void>;
}) {
  const attemptIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AccessPaymentView | null>(null);

  useEffect(() => {
    if (result?.status !== "PENDING") return;
    let active = true;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      if (!active || attempts >= 24) {
        window.clearInterval(timer);
        return;
      }
      attempts += 1;
      try {
        const response = await fetch("/api/subscriptions/payments/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: result.id }),
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as Partial<CheckoutResponse>;
        if (!active || !response.ok || !body.payment) return;
        setResult(body.payment);
        if (body.payment.status !== "PENDING") {
          window.clearInterval(timer);
          await onPayment(body.payment);
        }
      } catch {
        // Temporary polling failures do not change the payment or access state.
      }
    }, 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [onPayment, result?.id, result?.status]);

  if (!publicKey) {
    return (
      <p
        role="alert"
        className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
      >
        A chave pública do Mercado Pago não foi configurada neste ambiente.
      </p>
    );
  }

  const submit = async (submission: PaymentSubmission) => {
    setError("");
    const safe = safeSubmission(submission);
    attemptIdRef.current ??= safe.attemptId;
    safe.attemptId = attemptIdRef.current;
    const response = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safe),
    });
    const body = (await response.json().catch(() => ({}))) as Partial<
      CheckoutResponse & { error: string }
    >;
    if (!response.ok || !body.payment) {
      setError(body.error ?? "Não foi possível processar o pagamento.");
      throw new Error("PAYMENT_CHECKOUT_FAILED");
    }
    attemptIdRef.current = null;
    setResult(body.payment);
    await onPayment(body.payment);
    return body;
  };

  if (result?.status === "PENDING" && result.pix) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Pix gerado. O acesso será liberado somente depois que o Mercado Pago
          confirmar o pagamento.
        </p>
        {result.pix.qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element -- provider returns a short-lived data URI
          <img
            alt="QR Code Pix"
            className="mx-auto h-56 w-56"
            src={`data:image/png;base64,${result.pix.qrCodeBase64}`}
          />
        )}
        {result.pix.qrCode && (
          <>
            <label className="text-sm font-bold" htmlFor="pix-copy-code">
              Pix copia e cola
            </label>
            <textarea
              id="pix-copy-code"
              className="min-h-28 w-full rounded-2xl border border-line p-3 text-xs"
              readOnly
              value={result.pix.qrCode}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(result.pix!.qrCode!)}
            >
              Copiar código Pix
            </Button>
          </>
        )}
      </div>
    );
  }

  if (result && result.status !== "PENDING") {
    const approved = result.status === "APPROVED";
    return (
      <div className="space-y-4">
        <p
          className={`rounded-2xl p-4 text-sm font-semibold ${approved ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {approved
            ? "Pagamento aprovado. Seu acesso foi renovado por 30 dias."
            : "Pagamento não concluído. Tente novamente ou escolha outro meio."}
        </p>
        {!approved && (
          <Button type="button" onClick={() => setResult(null)}>
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-extrabold">
          Meios de pagamento
        </h3>
        <p className="mt-1 text-sm text-muted">
          Pix ou cartão de crédito, processados com segurança pelo Mercado Pago.
        </p>
      </div>
      {!ready && (
        <p className="text-sm text-muted">Carregando pagamento seguro…</p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <Payment
        initialization={{ amount, payer: { email: payerEmail } }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            bankTransfer: ["pix"],
            maxInstallments: 1,
          },
          visual: { style: { theme: "default" } },
        }}
        locale="pt-BR"
        onReady={() => setReady(true)}
        onError={(sdkError) => {
          console.error(
            JSON.stringify({
              stage: "payment-brick",
              sdkErrorType: sdkError.type,
              sdkErrorCause: sdkError.cause,
              sdkErrorMessage: sdkError.message,
            }),
          );
          setError("O formulário seguro do Mercado Pago encontrou um erro.");
        }}
        onSubmit={submit}
      />
    </div>
  );
}
