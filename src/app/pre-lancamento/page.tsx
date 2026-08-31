import type { Metadata } from "next";

import { PrelaunchLanding } from "@/components/prelaunch/prelaunch-landing";

export const metadata: Metadata = {
  title: "Vapor Entregas | Lançamento em 25 de setembro",
  description:
    "O App da Vapor chega a Petrolina e Juazeiro em 25 de setembro para conectar empresas e motoboys independentes.",
  openGraph: {
    title: "Vapor Entregas | Lançamento em 25 de setembro",
    description:
      "O App da Vapor chega a Petrolina e Juazeiro em 25 de setembro para conectar empresas e motoboys independentes.",
    type: "website",
  },
};

export default function PrelaunchPage() {
  return <PrelaunchLanding />;
}
