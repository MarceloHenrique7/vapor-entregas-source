import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icons/icon";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePageRole } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "Cadastro concluído" };
export const dynamic = "force-dynamic";

export default async function RegistrationCompletedPage() {
  const user = await requirePageRole(["COMPANY", "MOTOBOY"]);
  const company = user.role === "COMPANY";

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:grid sm:place-items-center sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Logo />
        <Card className="mt-8 overflow-hidden p-6 sm:p-9">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-light text-brand">
            <Icon name={company ? "building" : "bike"} className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
            {company
              ? "🎉 Sua empresa está na Vapor!"
              : "🛵 Cadastro concluído!"}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            {company
              ? "Sua conta está pronta. Agora você pode configurar os dados da empresa e a localização da loja."
              : "Sua conta está pronta. Revise seus dados para deixar o perfil organizado."}
          </p>

          {company ? (
            <section className="mt-8 rounded-3xl border border-line bg-canvas p-5 sm:p-6">
              <h2 className="font-display text-xl font-extrabold">
                Vamos deixar sua empresa pronta?
              </h2>
              <ul className="mt-5 space-y-4 text-sm font-semibold text-ink-soft">
                <li className="flex items-center gap-3">
                  <Icon name="check" className="size-5 text-green-600" />
                  Conta criada
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-5 rounded-full border-2 border-brand" />
                  Configure a localização da sua loja
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-5 rounded-full border-2 border-line" />
                  Complete as informações da empresa
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-5 rounded-full border-2 border-line" />
                  Conheça o fluxo para publicar uma entrega
                </li>
              </ul>
              <Link
                href="/app/empresa/configuracoes/localizacao"
                className={buttonStyles({
                  size: "lg",
                  className: "mt-7 w-full",
                })}
              >
                CONFIGURAR MINHA EMPRESA →
              </Link>
            </section>
          ) : (
            <section className="mt-8 rounded-3xl border border-line bg-canvas p-5 sm:p-6">
              <p className="text-sm leading-6 text-muted">
                Você pode revisar seus dados agora. As oportunidades exibidas
                respeitam a disponibilidade e as permissões da sua conta.
              </p>
              <Link
                href="/app/motoboy/configuracoes"
                className={buttonStyles({
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                REVISAR MEUS DADOS →
              </Link>
            </section>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm font-bold text-brand">
              Voltar para a página inicial
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
