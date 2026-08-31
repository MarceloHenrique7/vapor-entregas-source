"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

interface Item {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

function errorMessage(status: number) {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem acesso a estas notificações.";
  if (status === 422) return "Não foi possível validar a consulta.";
  return "O servidor não conseguiu carregar as notificações.";
}

export function NotificationCenter() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?pageSize=50", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(errorMessage(response.status));
      const data = (await response.json()) as { items: Item[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof TypeError
          ? "Sem conexão com o servidor. Verifique sua internet."
          : caught instanceof Error
            ? caught.message
            : "Não foi possível carregar as notificações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    async function loadInitialNotifications() {
      await load();
    }
    void loadInitialNotifications();
  }, [load]);
  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
    });
    if (response.ok) await load();
    else setError(errorMessage(response.status));
  }
  async function markAll() {
    const response = await fetch("/api/notifications/read-all", {
      method: "POST",
    });
    if (response.ok) await load();
    else setError(errorMessage(response.status));
  }
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Central interna"
        title="Notificações"
        description="Atualizações persistentes sobre oportunidades, entregas e denúncias. A central funciona mesmo sem notificações push."
      />
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-ink">{unread} não lida(s)</p>
          <p className="mt-1 text-sm text-muted">
            Esta central funciona sem push remoto e não solicita permissões ao
            abrir o app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 && (
            <Button onClick={markAll}>Marcar todas como lidas</Button>
          )}
        </div>
      </Card>
      {error && (
        <Card className="border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error}{" "}
          <button className="font-bold underline" onClick={load}>
            Tentar novamente
          </button>
        </Card>
      )}
      {loading ? (
        <div className="space-y-3" aria-label="Carregando notificações">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="bell"
            title="Nenhuma notificação por enquanto"
            description="Quando houver uma atualização relevante, ela aparecerá aqui."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "p-5",
                !item.readAt && "border-brand/30 bg-brand-light/25",
              )}
            >
              <div className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand">
                  <Icon name="bell" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-bold text-ink">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {item.message}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(item.createdAt))}
                    </time>
                  </div>
                  {!item.readAt && (
                    <button
                      className="mt-3 min-h-11 text-sm font-bold text-brand underline-offset-4 hover:underline"
                      onClick={() => markRead(item.id)}
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
