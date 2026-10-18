import type { Metadata } from "next";
import Link from "next/link";

import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { NewDeliveryForm } from "@/components/deliveries/new-delivery-form";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePageRole } from "@/server/auth/page-guard";
import { prismaDeliveryRepository } from "@/server/deliveries/prisma-delivery-repository";
import { getImportedOrderDraft } from "@/server/integrations/integration-service";

export const metadata: Metadata = { title: "Nova entrega" };
export const dynamic = "force-dynamic";

export default async function NewDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ repetir?: string; importado?: string }>;
}) {
  const user = await requirePageRole(["COMPANY"]);
  const { repetir, importado } = await searchParams;
  const pickup = await prismaDeliveryRepository.getCompanyPickup(user.id);
  let importedDraft;
  try {
    importedDraft = importado
      ? await getImportedOrderDraft(user.id, importado)
      : undefined;
  } catch {
    notFound();
  }
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Nova entrega"
        title="Para onde vamos?"
        description="Confirme o destino, o valor e as condições. A coleta já está preenchida."
      />
      {pickup ? (
        <NewDeliveryForm
          pickup={pickup}
          repeatDeliveryId={repetir}
          importedDraft={importedDraft}
        />
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
