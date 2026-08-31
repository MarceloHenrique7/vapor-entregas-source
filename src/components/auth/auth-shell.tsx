import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icons/icon";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  sideTitle = "Uma plataforma local, feita para conexões mais simples.",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  sideTitle?: string;
}) {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="text-sm font-bold text-muted hover:text-brand"
          >
            Voltar ao início
          </Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-xl py-12">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-brand">
            {eyebrow}
          </p>
          <h1 className="text-balance mt-3 font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
      <aside className="soft-grid relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#ffb4ba]">
            <Icon name="route" className="size-4" /> Petrolina + Juazeiro • Vale
            do São Francisco
          </span>
          <h2 className="text-balance mt-8 max-w-xl font-display text-5xl font-extrabold leading-[1.06] tracking-[-.05em]">
            {sideTitle}
          </h2>
        </div>
        <div className="relative grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <Icon name="smartphone" className="size-6 text-[#ffb4ba]" />
            <p className="mt-4 font-bold">App no celular</p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Publique, acompanhe e consulte sua rotina onde estiver.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <Icon name="bike" className="size-6 text-[#ffb4ba]" />
            <p className="mt-4 font-bold">Conexão local</p>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Empresas e motoboys independentes em uma só plataforma.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
