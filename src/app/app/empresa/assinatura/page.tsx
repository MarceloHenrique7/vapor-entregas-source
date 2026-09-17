import { CompanySubscriptionDashboard } from "@/components/company-pro/company-subscription-dashboard";
import { requirePageRole } from "@/server/auth/page-guard";
import { getCompanyPlanOverview } from "@/server/company-pro/company-pro-service";

export default async function CompanySubscriptionPage() {
  const user = await requirePageRole(["COMPANY"]);
  const overview = await getCompanyPlanOverview(user.id);
  return <CompanySubscriptionDashboard overview={overview} />;
}
