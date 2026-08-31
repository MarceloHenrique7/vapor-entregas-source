import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getLegalEnv } from "@/server/config/env";

export function Footer() {
  const { contactEmail } = getLegalEnv();
  return (
    <footer className="border-t border-line bg-white">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            Tecnologia local para aproximar empresas e motoboys independentes em
            Petrolina e Juazeiro.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-ink">Produto</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted">
            <Link href="/#como-funciona">Como funciona</Link>
            <Link href="/#precos">Preços</Link>
            <Link href="/planos">Planos</Link>
            <Link href="/entrar">Entrar</Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-ink">Transparência</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted">
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Política de Privacidade</Link>
            <Link href="/regras">Regras operacionais</Link>
            {contactEmail ? (
              <a href={`mailto:${contactEmail}`}>Contato</a>
            ) : (
              <span>Contato: pendente para produção</span>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="page-shell flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© Vapor Entregas.</p>
          <p>Petrolina/PE · Juazeiro/BA</p>
        </div>
      </div>
    </footer>
  );
}
