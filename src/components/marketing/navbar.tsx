"use client";

import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icons/icon";
import { buttonStyles } from "@/components/ui/button";

const links = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/#precos", label: "Preços" },
  { href: "/#faq", label: "Dúvidas" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-xl">
      <div className="page-shell flex h-18 items-center justify-between">
        <Logo />
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Navegação principal"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink-soft transition hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/entrar"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro/empresa"
            className={buttonStyles({ size: "sm" })}
          >
            Começar agora
          </Link>
        </div>
        <button
          className="grid size-11 place-items-center rounded-2xl border border-line bg-white sm:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          <Icon name={open ? "x" : "menu"} className="size-5" />
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-4 py-4 sm:hidden">
          <nav
            className="mx-auto flex max-w-xl flex-col gap-1"
            aria-label="Navegação móvel"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold text-ink-soft hover:bg-brand-light"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/entrar"
                className={buttonStyles({ variant: "outline" })}
              >
                Entrar
              </Link>
              <Link href="/cadastro/empresa" className={buttonStyles()}>
                Cadastrar
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
