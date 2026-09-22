import type { Metadata } from "next";

import { PublicTrackingView } from "@/components/tracking/public-tracking-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acompanhar entrega",
  description: "Acompanhamento temporário de uma entrega pela Vapor Entregas.",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicTrackingView token={token} />;
}
