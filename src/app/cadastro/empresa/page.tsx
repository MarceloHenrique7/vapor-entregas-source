import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { CompanyRegistrationForm } from "@/components/auth/company-registration-form";

export const metadata: Metadata = { title: "Cadastro de empresa" };
export default function CompanyRegistrationPage() {
  return (
    <AuthShell
      eyebrow="Cadastro · Sou empresa"
      title="Crie sua conta"
      description="É grátis para empresas e leva poucos passos."
      sideTitle="Entre com o essencial. Configure sua loja logo depois."
    >
      <CompanyRegistrationForm />
    </AuthShell>
  );
}
