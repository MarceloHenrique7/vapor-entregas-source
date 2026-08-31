import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { CompanyRegistrationForm } from "@/components/auth/company-registration-form";

export const metadata: Metadata = { title: "Cadastro de empresa" };
export default function CompanyRegistrationPage() {
  return (
    <AuthShell
      eyebrow="Cadastro • Sou empresa"
      title="Comece com a Vapor."
      description="Crie sua conta e tenha o App da Vapor pronto para publicar e organizar as entregas do seu negócio."
      sideTitle="Vamos colocar sua empresa a todo Vapor. ⚡"
    >
      <CompanyRegistrationForm />
    </AuthShell>
  );
}
