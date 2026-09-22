import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { PreRegistrationForm } from "@/components/prelaunch/pre-registration-form";
import { PRELAUNCH_LAUNCH_DATE_SHORT_LABEL } from "@/config/prelaunch";

export const metadata: Metadata = {
  title: "Pré-cadastro",
  description: `Entre para o lançamento da Vapor Entregas em Petrolina e Juazeiro no dia ${PRELAUNCH_LAUNCH_DATE_SHORT_LABEL}.`,
};

export default function PreRegistrationPage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:grid sm:place-items-center sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <Logo />
        <section className="mt-8 rounded-[2rem] border border-line bg-white p-5 shadow-soft sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
            Lançamento • {PRELAUNCH_LAUNCH_DATE_SHORT_LABEL}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.04em]">
            Deixe sua conta pronta.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Comece seu cadastro agora e esteja pronto para o lançamento da Vapor
            em {PRELAUNCH_LAUNCH_DATE_SHORT_LABEL}.
          </p>
          <div className="mt-6">
            <PreRegistrationForm />
          </div>
        </section>
        <div className="mt-6 flex justify-center gap-5 text-xs font-bold text-muted">
          <Link href="/" className="hover:text-brand">
            Voltar
          </Link>
          <Link href="/termos" className="hover:text-brand">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-brand">
            Privacidade
          </Link>
        </div>
      </div>
    </main>
  );
}
