import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/marketing/footer";

export function LegalPage({
  title,
  intro,
  sections,
  version,
}: {
  title: string;
  intro: string;
  sections: Array<{ title: string; content: string }>;
  version: string;
}) {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="page-shell flex h-18 items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="text-sm font-bold text-muted hover:text-brand"
          >
            Voltar
          </Link>
        </div>
      </header>
      <article className="page-shell max-w-3xl py-12 sm:py-18">
        <Badge variant="warning">Minuta para revisão jurídica</Badge>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-.04em]">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted">{intro}</p>
        <p className="mt-3 text-sm font-bold text-brand">Versão {version}</p>
        <div className="mt-10 space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-extrabold">
                {section.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-soft">
                {section.content}
              </p>
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
          MINUTA — REVISÃO JURÍDICA NECESSÁRIA ANTES DO LANÇAMENTO.
        </div>
      </article>
      <Footer />
    </main>
  );
}
