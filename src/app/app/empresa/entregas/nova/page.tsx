import type { Metadata } from "next";
import Link from "next/link";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { NewDeliveryForm } from "@/components/deliveries/new-delivery-form";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePageRole } from "@/server/auth/page-guard";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";

export const metadata: Metadata = { title: "Nova entrega" };
export const dynamic = "force-dynamic";

export default async function NewDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ repetir?: string }>;
}) {
  const user = await requirePageRole(["COMPANY"]);
  const { repetir } = await searchParams;
  const pickup = await prismaDeliveryRepository.getCompanyPickup(user.id);
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Oportunidade de entrega"
        title="Nova entrega"
        description="Informe o destino, o valor oferecido e a forma de pagamento direto ao motoboy."
      />
      {pickup ? (
        <NewDeliveryForm pickup={pickup} repeatDeliveryId={repetir} />
      ) : (
        <Card>
          <EmptyState
            icon="map"
            title="Confirme primeiro o ponto de coleta"
            description="A nova entrega utiliza o ponto padrão cadastrado na configuração da empresa."
            action={
              <Link
                href="/app/empresa/configuracoes/localizacao"
                className={buttonStyles()}
              >
                Configurar localização
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}
