import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSessionUser } from "@/server/auth/session";
import { getPrelaunchEnv } from "@/server/config/env";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();
  if (user)
    redirect(
      getPrelaunchEnv().enabled && user.role !== "ADMIN"
        ? "/cadastro/concluido"
        : user.role === "ADMIN"
          ? "/admin"
          : user.role === "COMPANY"
            ? "/app/empresa"
            : "/app/motoboy",
    );
  return (
    <AuthShell
      eyebrow="App da Vapor"
      title="Bem-vindo de volta à Vapor."
      description="Acesse a plataforma e continue sua operação. Sua empresa a todo Vapor, onde estiver."
      sideTitle="Seu negócio vende. A Vapor ajuda a movimentar suas entregas."
    >
      <LoginForm />
    </AuthShell>
  );
}
