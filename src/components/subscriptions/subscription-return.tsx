"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type State = "checking" | "active" | "pending" | "failed";

export function SubscriptionReturn({ backHref }: { backHref: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState(
    "Estamos confirmando sua assinatura com o Mercado Pago…",
  );

  useEffect(() => {
    let active = true;
    async function synchronize() {
      try {
        const response = await fetch("/api/subscriptions/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const body = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok)
          throw new Error(body.error ?? "Falha ao consultar a assinatura.");
        const status = body.subscription?.status as string | undefined;
        if (status === "ACTIVE" || status === "TRIAL") {
          setState("active");
          setMessage(
            "Assinatura confirmada. Seu acesso operacional está liberado.",
          );
        } else if (status === "PENDING") {
          setState("pending");
          setMessage(
            "A autorização ainda está pendente. Aguarde a confirmação do Mercado Pago.",
          );
        } else {
          setState("failed");
          setMessage(
            status === "PAST_DUE"
              ? "A cobrança não foi aprovada. Consulte sua assinatura para regularizar o pagamento."
              : "A assinatura não foi autorizada. Consulte sua assinatura para tentar novamente.",
          );
        }
      } catch (error) {
        if (!active) return;
        setState("failed");
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar agora.",
        );
      }
    }
    void synchronize();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="p-7 text-center sm:p-10">
        {state === "checking" && (
          <Skeleton className="mx-auto mb-6 h-16 w-16 rounded-full" />
        )}
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
          Retorno do Mercado Pago
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold">
          {state === "checking"
            ? "Confirmando assinatura"
            : state === "active"
              ? "Tudo certo"
              : state === "pending"
                ? "Aguardando confirmação"
                : "Assinatura não confirmada"}
        </h1>
        <p role="status" className="mt-4 text-sm leading-6 text-muted">
          {message}
        </p>
        <div className="mt-7">
          <Link href={backHref} className={buttonStyles()}>
            Ir para Minha assinatura
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted">
          Esta página não ativa o plano pelo redirecionamento; o estado é
          consultado no provedor.
        </p>
      </Card>
    </div>
  );
}
