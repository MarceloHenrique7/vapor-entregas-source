import { AdminReportDetails } from "@/components/admin/admin-ui";
export default async function AdminReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminReportDetails id={id} />;
}
