import type { Metadata } from "next";

import { PrelaunchLanding } from "@/components/prelaunch/prelaunch-landing";
import { PRELAUNCH_LAUNCH_DATE_SHORT_LABEL } from "@/config/prelaunch";

export const metadata: Metadata = {
  title: `Vapor Entregas | Lançamento em ${PRELAUNCH_LAUNCH_DATE_SHORT_LABEL}`,
  description: `O App da Vapor chega a Petrolina e Juazeiro em ${PRELAUNCH_LAUNCH_DATE_SHORT_LABEL} para conectar empresas e motoboys independentes.`,
  openGraph: {
    title: `Vapor Entregas | Lançamento em ${PRELAUNCH_LAUNCH_DATE_SHORT_LABEL}`,
    description: `O App da Vapor chega a Petrolina e Juazeiro em ${PRELAUNCH_LAUNCH_DATE_SHORT_LABEL} para conectar empresas e motoboys independentes.`,
    type: "website",
  },
};

export default function PrelaunchPage() {
  return <PrelaunchLanding />;
}
