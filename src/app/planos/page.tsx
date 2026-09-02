import type { Metadata } from "next";

import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { PublicPlans } from "@/components/subscriptions/public-plans";

export const metadata: Metadata = {
  title: "Planos | Vapor Entregas",
  description: "Planos de 30 dias de acesso à plataforma Vapor Entregas.",
};

export default function PlansPage() {
  return (
    <>
      <Navbar />
      <main className="page-shell min-h-[70vh] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
            Assinatura da plataforma
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Escolha seu acesso à Vapor Entregas
          </h1>
          <p className="mt-4 text-muted">
            Cada pagamento libera 30 dias de funções comerciais. O pagamento de
            cada entrega continua sendo combinado diretamente entre empresa e
            motoboy.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <PublicPlans />
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-muted">
          Pagamento avulso por Pix ou cartão processado pelo Mercado Pago. A
          Vapor Entregas não armazena dados de cartão. Valores e eventual
          período de teste são configuráveis.
        </p>
      </main>
      <Footer />
    </>
  );
}
