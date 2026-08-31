import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { MotoboyRegistrationForm } from "@/components/auth/motoboy-registration-form";

export const metadata: Metadata = { title: "Cadastro de motoboy" };
export default function MotoboyRegistrationPage() {
  return (
    <AuthShell
      eyebrow="Cadastro • Sou motoboy"
      title="Comece com a Vapor."
      description="Crie sua conta para ficar disponível e visualizar oportunidades de entrega publicadas na plataforma."
      sideTitle="Faça parte da rede Vapor, com sua autonomia preservada."
    >
      <MotoboyRegistrationForm />
    </AuthShell>
  );
}
