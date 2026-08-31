import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import {
  CompanyLocationForm,
  type InitialCompanyLocation,
} from "@/components/maps/company-location-form";
import { requirePageRole } from "@/server/auth/page-guard";
import { getPrisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Localização da empresa",
};

export const dynamic = "force-dynamic";

export default async function CompanyLocationPage() {
  const user = await requirePageRole(["COMPANY"]);
  const profile = await getPrisma().companyProfile.findUnique({
    where: { userId: user.id },
    select: {
      city: true,
      locations: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          label: true,
          address: true,
          number: true,
          neighborhood: true,
          complement: true,
          reference: true,
          city: true,
          state: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          isDefault: true,
        },
      },
    },
  });
  if (!profile) notFound();

  const existing = profile.locations[0];
  const city = existing?.city ?? profile.city;
  const state = city === "PETROLINA_PE" ? "PE" : "BA";
  const initial: InitialCompanyLocation = existing
    ? {
        ...existing,
        state: existing.state as "PE" | "BA",
        complement: existing.complement ?? "",
        reference: existing.reference ?? "",
        postalCode: existing.postalCode ?? "",
        latitude: existing.latitude?.toNumber() ?? null,
        longitude: existing.longitude?.toNumber() ?? null,
      }
    : {
        id: "",
        label: "Loja principal",
        address: "",
        number: "",
        neighborhood: "",
        complement: "",
        reference: "",
        city,
        state,
        postalCode: "",
        latitude: null,
        longitude: null,
        isDefault: false,
      };

  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Configurações da empresa"
        title="Localização da empresa"
        description="Cadastre o ponto exato que será usado futuramente como origem padrão das coletas."
      />
      <CompanyLocationForm initial={initial} />
    </div>
  );
}
