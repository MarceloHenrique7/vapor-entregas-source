import type { Metadata } from "next";

import { PrelaunchLanding } from "@/components/prelaunch/prelaunch-landing";

const title =
  "Vapor Entregas | Motoboy para sua empresa em Petrolina e Juazeiro";
const description =
  "Publique entregas grátis, conecte-se a motoboys disponíveis e acompanhe sua operação em Petrolina e Juazeiro.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: ["/icons/vapor-entregas-512.png"],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/icons/vapor-entregas-512.png"],
  },
};

export default function Home() {
  return <PrelaunchLanding />;
}
