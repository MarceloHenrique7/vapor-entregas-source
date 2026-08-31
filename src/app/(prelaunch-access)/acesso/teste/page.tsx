import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSessionUser } from "@/server/auth/session";
import { getPrelaunchEnv } from "@/server/config/env";
import { canBypassPrelaunch } from "@/server/prelaunch/policy";

export const metadata: Metadata = {
  title: "Acesso de homologação",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TestAccessPage() {
  const prelaunch = getPrelaunchEnv();
  if (!prelaunch.enabled) notFound();
  const user = await getCurrentSessionUser();
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
      eyebrow="Homologação"
      title="Acesso de conta de teste"
      description="Somente contas previamente autorizadas pela equipe podem entrar neste ambiente."
      sideTitle="Acesso protegido pela autenticação e pela lista server-side de UUIDs."
    >
      <LoginForm restricted endpoint="/api/prelaunch/login/test" />
    </AuthShell>
  );
}
