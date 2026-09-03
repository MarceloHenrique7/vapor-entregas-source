"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/icons/icon";
import { useNotificationEvents } from "@/components/notifications/use-notification-events";

export function NotificationShortcut({ href }: { href: string }) {
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?pageSize=1", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as { unread?: number };
        setUnread(data.unread ?? 0);
      }
    } catch {
      // Navigation remains available while the polling fallback retries.
    }
  }, []);
  useEffect(() => {
    async function loadInitialUnreadCount() {
      await load();
    }
    void loadInitialUnreadCount();
  }, [load]);
  useNotificationEvents(load);
  return (
    <Link
      href={href}
      className="relative grid size-11 place-items-center rounded-2xl border border-line bg-white text-ink transition hover:border-brand/30 hover:text-brand"
      aria-label={
        unread > 0 ? `${unread} notificações não lidas` : "Notificações"
      }
    >
      <Icon name="bell" className="size-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
