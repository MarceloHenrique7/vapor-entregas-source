import type { Metadata } from "next";

import { IntegrationsDashboard } from "@/components/integrations/integrations-dashboard";

export const metadata: Metadata = { title: "Integrações" };

export default function IntegrationsPage() {
  return <IntegrationsDashboard />;
}
