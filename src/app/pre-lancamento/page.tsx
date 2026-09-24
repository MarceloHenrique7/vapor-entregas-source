import type { Metadata } from "next";

import { PrelaunchLanding } from "@/components/prelaunch/prelaunch-landing";

const title = "Vapor Entregas | Entregas locais para empresas";
const description =
  "Publique entregas grátis e conecte sua empresa a motoboys disponíveis em Petrolina e Juazeiro.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
};

export default function PrelaunchPage() {
  return <PrelaunchLanding />;
}
