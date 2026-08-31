import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSessionUser } from "@/server/auth/session";
import { getPrelaunchEnv } from "@/server/config/env";
import { canBypassPrelaunch } from "@/server/prelaunch/policy";

export const metadata: Metadata = {
  title: "Acesso restrito",
  robots: { index: false, follow: false },
};

export default async function RestrictedAccessPage() {
  const user = await getCurrentSessionUser();
  const prelaunch = getPrelaunchEnv();
  if (!prelaunch.enabled) notFound();
  if (user && canBypassPrelaunch(user, prelaunch.testUserIds)) {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "COMPANY"
          ? "/app/empresa"
          : "/app/motoboy",
    );
  }
  return (
    <AuthShell
      eyebrow="Acesso restrito"
      title="Acesso administrativo"
      description="Entre somente com uma conta administrativa ativa."
      sideTitle="Ambiente operacional protegido durante o pré-lançamento."
    >
      <LoginForm restricted endpoint="/api/prelaunch/login/admin" />
    </AuthShell>
  );
}
