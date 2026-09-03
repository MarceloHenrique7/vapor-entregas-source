"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/icons/icon";
import { NotificationShortcut } from "@/components/notifications/notification-shortcut";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type { NavigationItem } from "./navigation";

export function DashboardShell({
  children,
  navigation,
  user,
  roleLabel,
}: {
  children: React.ReactNode;
  navigation: NavigationItem[];
  user: { name: string; email: string };
  roleLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeHref = navigation
    .filter(
      (item) =>
        item.href === pathname ||
        (item.href.split("/").length > 3 &&
          pathname.startsWith(`${item.href}/`)),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const isActive = (href: string) => href === activeHref;
  async function logout() {
    setLoggingOut(true);
    try {
      window.dispatchEvent(new Event("vapor-entregas:logout"));
      window.dispatchEvent(new Event("entregavale:logout"));
      await fetch("/api/auth/logout", { method: "POST" });
      setMobileMenuOpen(false);
      router.replace("/entrar");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }
  const mobileItems = navigation.filter((item) => item.mobile).slice(0, 4);
  const mobileMenuIsActive = navigation.some(
    (item) =>
      !mobileItems.some(({ href }) => href === item.href) &&
      isActive(item.href),
  );
  const notificationsHref = navigation.find(
    (item) => item.icon === "bell",
  )?.href;
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-line bg-white p-5 lg:flex">
        <Logo />
        <div className="mt-8 rounded-2xl bg-brand-light/65 p-4">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand">
            {roleLabel}
          </p>
          <p className="mt-2 truncate font-bold text-ink">{user.name}</p>
          <p className="mt-1 truncate text-xs text-muted">{user.email}</p>
        </div>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Navegação do painel">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                isActive(item.href)
                  ? "bg-brand text-white shadow-[0_8px_18px_rgba(234,29,44,.18)]"
                  : "text-ink-soft hover:bg-brand-light/60 hover:text-brand-dark",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-muted hover:bg-red-50 hover:text-red-700"
        >
          <Icon name="log-out" className="size-5" />
          {loggingOut ? "Saindo..." : "Sair"}
        </button>
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <Logo compact />
          <div className="flex items-center gap-3">
            {notificationsHref && (
              <NotificationShortcut href={notificationsHref} />
            )}
            <div className="text-right">
              <p className="max-w-40 truncate text-sm font-bold">{user.name}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[90rem] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(31,31,31,.08)] backdrop-blur lg:hidden"
          style={{
            gridTemplateColumns: `repeat(${mobileItems.length + 1}, minmax(0, 1fr))`,
          }}
          aria-label="Navegação inferior"
        >
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold",
                isActive(item.href) ? "text-brand" : "text-muted",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold",
              mobileMenuIsActive ? "text-brand" : "text-muted",
            )}
            aria-label="Abrir menu completo"
            aria-expanded={mobileMenuOpen}
          >
            <Icon name="menu" className="size-5" />
            <span>Menu</span>
          </button>
        </nav>
        <Dialog
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="Menu"
          description={`${roleLabel} · ${user.name}`}
        >
          <nav className="grid gap-2" aria-label="Menu completo do painel">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                  isActive(item.href)
                    ? "bg-brand text-white"
                    : "border border-line text-ink-soft hover:border-brand/30 hover:bg-brand-light/40 hover:text-brand-dark",
                )}
              >
                <Icon name={item.icon} className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-5 grid gap-3 border-t border-line pt-5">
            <InstallAppButton className="w-full" />
            <Button
              variant="outline"
              className="w-full justify-center text-red-700"
              onClick={logout}
              disabled={loggingOut}
            >
              <Icon name="log-out" className="size-5" />
              {loggingOut ? "Saindo..." : "Sair da conta"}
            </Button>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
