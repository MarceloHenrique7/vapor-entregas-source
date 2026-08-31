import { AdminUserDetails } from "@/components/admin/admin-ui";
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetails id={id} />;
}
