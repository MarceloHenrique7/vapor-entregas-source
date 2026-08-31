"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Plan {
  id: string;
  role: "MOTOBOY" | "COMPANY";
  name: string;
  description: string;
  monthlyPrice: number;
  trialDays: number;
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PublicPlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/subscriptions/plans")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ plans: Plan[] }>;
      })
      .then((body) => setPlans(body.plans))
      .catch(() => setError("Não foi possível carregar os planos agora."));
  }, []);

  if (error)
    return (
      <p role="alert" className="text-center text-red-700">
        {error}
      </p>
    );
  if (!plans) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {plans.map((plan) => (
        <Card key={plan.id} className="p-7">
          <p className="font-display text-2xl font-extrabold">{plan.name}</p>
          <p className="mt-5">
            <span className="font-display text-4xl font-extrabold text-brand">
              {money.format(plan.monthlyPrice)}
            </span>
            <span className="text-muted">/mês</span>
          </p>
          <p className="mt-4 min-h-12 text-sm leading-6 text-muted">
            {plan.description}
          </p>
          {plan.trialDays > 0 && (
            <p className="mt-3 text-sm font-bold text-brand-dark">
              Teste grátis de {plan.trialDays} dias
            </p>
          )}
          <Link
            href={
              plan.role === "MOTOBOY"
                ? "/cadastro/motoboy"
                : "/cadastro/empresa"
            }
            className={buttonStyles({ className: "mt-7 w-full" })}
          >
            Criar cadastro
          </Link>
        </Card>
      ))}
    </div>
  );
}
