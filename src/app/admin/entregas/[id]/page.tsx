import { AdminDeliveryDetails } from "@/components/admin/admin-ui";
export default async function AdminDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDeliveryDetails id={id} />;
}
