import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import {
  CompanyLocationForm,
  type InitialCompanyLocation,
} from "@/components/maps/company-location-form";
import { requirePageRole } from "@/server/auth/page-guard";
import { getPrelaunchEnv } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { canBypassPrelaunch } from "@/server/prelaunch/policy";

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
  const city = existing?.city ?? profile.city ?? "PETROLINA_PE";
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

  const onboarding = !existing;
  const prelaunch = getPrelaunchEnv();
  const operationalAccess =
    !prelaunch.enabled || canBypassPrelaunch(user, prelaunch.testUserIds);

  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow={
          onboarding ? "Passo 2 de 2 · Localização" : "Configurações da empresa"
        }
        title={
          onboarding ? "Agora configure sua loja" : "Localização da empresa"
        }
        description={
          onboarding
            ? "Precisamos saber de onde os motoboys irão retirar suas entregas."
            : "Cadastre o ponto exato que será usado como origem padrão das coletas."
        }
      />
      <CompanyLocationForm
        initial={initial}
        onboarding={onboarding}
        nextHref={
          operationalAccess
            ? "/app/empresa/entregas/nova"
            : "/cadastro/concluido"
        }
      />
    </div>
  );
}
