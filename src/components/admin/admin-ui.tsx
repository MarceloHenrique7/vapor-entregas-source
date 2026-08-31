"use client";

/* eslint-disable react-hooks/set-state-in-effect -- loads are explicit API synchronization effects */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AdminAuditItem,
  AdminDashboardMetrics,
  AdminDeliveryDetail,
  AdminDeliveryListItem,
  AdminReportListItem,
  AdminUserDetail,
  AdminUserListItem,
  Paginated,
} from "@/server/admin/types";

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  COMPANY: "Empresa",
  MOTOBOY: "Motoboy",
};
const cityLabel: Record<string, string> = {
  PETROLINA_PE: "Petrolina/PE",
  JUAZEIRO_BA: "Juazeiro/BA",
};
const userStatusLabel: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  BLOCKED: "Banido",
  DELETED: "Excluído",
};
const reportStatusLabel: Record<string, string> = {
  OPEN: "Aberta",
  UNDER_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
  DISMISSED: "Descartada",
};
const reportCategoryLabel: Record<string, string> = {
  USER_NO_SHOW: "Usuário não apareceu",
  FRAUD_ATTEMPT: "Tentativa de fraude",
  INAPPROPRIATE_BEHAVIOR: "Comportamento inadequado",
  PAYMENT_PROBLEM: "Problema com pagamento",
  THREAT: "Ameaça",
  ACCIDENT: "Acidente",
  IRREGULAR_ORDER: "Pedido irregular",
  OTHER: "Outro",
};
const deliveryStatusLabel: Record<string, string> = {
  SEARCHING_MOTOBOY: "Procurando motoboy",
  ACCEPTED: "Aceita",
  MOTOBOY_TO_PICKUP: "A caminho da coleta",
  ARRIVED_AT_PICKUP: "Chegou na coleta",
  PICKED_UP: "Pedido coletado",
  IN_DELIVERY: "Em entrega",
  COMPLETED: "Concluída",
  CANCELLED_BY_COMPANY: "Cancelada pela empresa",
  CANCELLED_BY_MOTOBOY: "Cancelada pelo motoboy",
  EXPIRED: "Expirada",
  DISPUTED: "Em disputa",
};
const actionLabel: Record<string, string> = {
  USER_ACTIVATED: "Usuário ativado",
  USER_SUSPENDED: "Usuário suspenso",
  USER_BANNED: "Usuário banido",
  USER_REACTIVATED: "Usuário reativado",
  REPORT_STATUS_CHANGED: "Status de denúncia alterado",
  PRICING_RULE_CHANGED: "Regra de preço sugerido alterada",
  SUBSCRIPTION_PLAN_CHANGED: "Plano de assinatura alterado",
};
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error ?? "Não foi possível concluir a operação.");
  return body as T;
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-36 rounded-3xl" />
      ))}
    </div>
  );
}
function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card className="border-red-200 p-6">
      <p className="font-bold text-red-700">{message}</p>
      <Button className="mt-4" variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </Card>
  );
}
function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </Button>
      <span className="text-sm text-muted">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<{ metrics: AdminDashboardMetrics }>("/api/admin/dashboard")
      .then((value) => setMetrics(value.metrics))
      .catch((reason) => setError(reason.message));
  }, []);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Administração"
        title="Visão geral"
        description="Indicadores operacionais e de moderação, sem expor dados privados desnecessários."
      />
      <div className="mt-7">
        {error ? (
          <ErrorCard message={error} retry={load} />
        ) : !metrics ? (
          <LoadingCards />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="users"
              label="Usuários"
              value={String(metrics.totalUsers)}
              note="Todas as contas preservadas"
            />
            <StatCard
              icon="bike"
              label="Motoboys"
              value={String(metrics.totalMotoboys)}
              note="Contas cadastradas"
            />
            <StatCard
              icon="building"
              label="Empresas"
              value={String(metrics.totalCompanies)}
              note="Contas cadastradas"
            />
            <StatCard
              icon="bike"
              label="Online agora"
              value={String(metrics.motoboysOnline)}
              note="Presença recente e conta ativa"
            />
            <StatCard
              icon="package"
              label="Entregas criadas"
              value={String(metrics.deliveriesCreated)}
              note={`${metrics.deliveriesToday} criadas hoje`}
            />
            <StatCard
              icon="check"
              label="Concluídas"
              value={String(metrics.deliveriesCompleted)}
              note="Histórico preservado"
            />
            <StatCard
              icon="sparkles"
              label="Procurando motoboy"
              value={String(metrics.deliveriesSearching)}
              note="Oportunidades abertas"
            />
            <StatCard
              icon="x"
              label="Canceladas"
              value={String(metrics.deliveriesCancelled)}
              note="Sem punição automática"
            />
            <StatCard
              icon="shield"
              label="Denúncias abertas"
              value={String(metrics.reportsOpen)}
              note="Aguardando triagem"
            />
            <StatCard
              icon="history"
              label="Em análise"
              value={String(metrics.reportsUnderReview)}
              note="Moderação em andamento"
            />
            <StatCard
              icon="shield"
              label="Em disputa"
              value={String(metrics.deliveriesDisputed)}
              note="Entregas que exigem análise"
            />
            <StatCard
              icon="star"
              label="Média geral"
              value={
                metrics.overallRatingAverage?.toFixed(1).replace(".", ",") ??
                "—"
              }
              note="Avaliações da plataforma"
            />
          </div>
        )}
      </div>
    </>
  );
}

export function AdminUsers() {
  const [result, setResult] = useState<Paginated<AdminUserListItem> | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<Paginated<AdminUserListItem>>("/api/admin/users/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        role: role || undefined,
        status: status || undefined,
        city: city || undefined,
        page,
        pageSize: 20,
      }),
    })
      .then(setResult)
      .catch((reason) => setError(reason.message));
  }, [query, role, status, city, page]);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Moderação"
        title="Usuários"
        description="Busca administrativa paginada. CPF/CNPJ aceita somente correspondência exata e nunca aparece na URL."
      />
      <Card className="mt-6 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_11rem_11rem_11rem_auto]">
        <Input
          aria-label="Buscar usuário"
          placeholder="Nome, e-mail ou CPF/CNPJ exato"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Tipo de conta"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os tipos</option>
          <option value="MOTOBOY">Motoboy</option>
          <option value="COMPANY">Empresa</option>
          <option value="ADMIN">Admin</option>
        </Select>
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SUSPENDED">Suspenso</option>
          <option value="BLOCKED">Banido</option>
          <option value="DELETED">Excluído</option>
        </Select>
        <Select
          aria-label="Cidade"
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as cidades</option>
          <option value="PETROLINA_PE">Petrolina/PE</option>
          <option value="JUAZEIRO_BA">Juazeiro/BA</option>
        </Select>
        <Button onClick={load}>Buscar</Button>
      </Card>
      <div className="mt-5">
        {error ? (
          <ErrorCard message={error} retry={load} />
        ) : !result ? (
          <LoadingCards />
        ) : result.items.length === 0 ? (
          <EmptyState
            icon="users"
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros para consultar outras contas."
          />
        ) : (
          <>
            <div className="grid gap-3">
              {result.items.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/usuarios/${user.id}`}
                  className="block"
                >
                  <Card className="p-5 transition hover:border-brand/30">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {roleLabel[user.role]} ·{" "}
                          {user.city
                            ? cityLabel[user.city]
                            : "Cidade não informada"}{" "}
                          · {date(user.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          user.status === "ACTIVE"
                            ? "success"
                            : user.status === "SUSPENDED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {userStatusLabel[user.status]}
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-5 text-xs text-muted">
                      <span>{user.relatedDeliveries} entregas</span>
                      <span>
                        {user.ratingAverage?.toFixed(1).replace(".", ",") ??
                          "—"}{" "}
                        ★ ({user.ratingCount})
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Pager
              page={result.page}
              totalPages={result.totalPages}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}

export function AdminUserDetails({ id }: { id: string }) {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState<
    "ACTIVE" | "SUSPENDED" | "BLOCKED" | null
  >(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const load = useCallback(() => {
    setError("");
    api<{ user: AdminUserDetail }>(`/api/admin/users/${id}`)
      .then((value) => setUser(value.user))
      .catch((reason) => setError(reason.message));
  }, [id]);
  useEffect(load, [load]);
  async function submit() {
    if (!action) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, reason: reason || undefined }),
      });
      setSuccess(
        action === "ACTIVE"
          ? "Conta reativada e sessões anteriores revogadas."
          : action === "SUSPENDED"
            ? "Conta suspensa e acesso operacional encerrado."
            : "Conta banida e acesso operacional bloqueado.",
      );
      setAction(null);
      setReason("");
      load();
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error ? reasonValue.message : "Erro inesperado.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (error && !user) return <ErrorCard message={error} retry={load} />;
  if (!user) return <LoadingCards />;
  const facts = [
    ["Conta", roleLabel[user.role]],
    ["Cidade", user.city ? cityLabel[user.city] : "—"],
    ["Cadastro", date(user.createdAt)],
    ["E-mail", user.email],
    ["Telefone", user.phone],
    ["Documento", user.documentMasked ?? "—"],
    ...(user.role === "MOTOBOY" && user.vehiclePlate
      ? [["Placa da moto", user.vehiclePlate]]
      : []),
    [
      "Avaliações",
      `${user.ratingAverage?.toFixed(1).replace(".", ",") ?? "—"} ★ (${user.ratingCount})`,
    ],
    [
      user.role === "MOTOBOY"
        ? "Entregas aceitas"
        : user.role === "COMPANY"
          ? "Entregas publicadas"
          : "Entregas",
      String(
        user.role === "MOTOBOY"
          ? user.deliveriesAccepted
          : user.relatedDeliveries,
      ),
    ],
    ["Concluídas", String(user.deliveriesCompleted)],
    ["Cancelamentos", String(user.cancellations)],
    ["Denúncias recebidas", String(user.reportsReceived)],
    ["Denúncias feitas", String(user.reportsCreated)],
  ];
  return (
    <>
      <DashboardHeader
        eyebrow="Detalhes do usuário"
        title={user.name}
        description="Dados exibidos apenas para moderação administrativa."
        action={
          <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>
            {userStatusLabel[user.status]}
          </Badge>
        }
      />
      {success && (
        <Card className="mt-5 border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
          {success}
        </Card>
      )}
      {error && (
        <Card className="mt-5 border-red-200 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Card className="p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">
                  {label}
                </dt>
                <dd className="mt-1 break-words font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {user.fantasyName && (
            <p className="mt-6 text-sm">
              <strong>Nome fantasia:</strong> {user.fantasyName}
            </p>
          )}
          {user.location && (
            <p className="mt-3 text-sm">
              <strong>Localização:</strong> {user.location}
            </p>
          )}
          {user.isOnline !== null && (
            <p className="mt-3 text-sm">
              <strong>Presença:</strong>{" "}
              {user.isOnline ? "Online com presença recente" : "Offline"} ·
              última atualização {date(user.lastLocationAt)}
            </p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">
            Ações de moderação
          </h2>
          <p className="mt-2 text-sm text-muted">
            Toda ação encerra sessões ativas, preserva o histórico e gera
            auditoria.
          </p>
          {user.status === "DELETED" ? (
            <p className="mt-5 rounded-2xl border border-line bg-canvas p-4 text-sm text-muted">
              Conta encerrada pelo titular. Os registros preservados não podem
              ser reativados pela moderação.
            </p>
          ) : (
            <div className="mt-5 grid gap-3">
              {user.status !== "ACTIVE" && (
                <Button onClick={() => setAction("ACTIVE")}>
                  Reativar conta
                </Button>
              )}
              {user.status !== "SUSPENDED" && (
                <Button
                  variant="outline"
                  onClick={() => setAction("SUSPENDED")}
                >
                  Suspender conta
                </Button>
              )}
              {user.status !== "BLOCKED" && (
                <Button variant="danger" onClick={() => setAction("BLOCKED")}>
                  Banir conta
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
      <Dialog
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={
          action === "ACTIVE"
            ? "Reativar usuário?"
            : action === "SUSPENDED"
              ? "Suspender usuário?"
              : "Banir usuário?"
        }
        description="A confirmação será registrada na auditoria."
      >
        <FormField
          label="Motivo"
          htmlFor="reason"
          hint={
            action === "ACTIVE"
              ? "Opcional na reativação."
              : "Mínimo de 10 caracteres."
          }
        >
          <textarea
            id="reason"
            className="min-h-28 w-full rounded-2xl border border-line p-3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setAction(null)}>
            Cancelar
          </Button>
          <Button
            variant={action === "BLOCKED" ? "danger" : "primary"}
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function queryString(values: Record<string, string | number>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (String(value)) params.set(key, String(value));
  });
  return params.toString();
}
export function AdminDeliveries() {
  const [result, setResult] = useState<Paginated<AdminDeliveryListItem> | null>(
    null,
  );
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [motoboy, setMotoboy] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [city, setCity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<Paginated<AdminDeliveryListItem>>(
      `/api/admin/deliveries?${queryString({ status, company, motoboy, deliveryId, city, from, to, page, pageSize: 20 })}`,
    )
      .then(setResult)
      .catch((reason) => setError(reason.message));
  }, [status, company, motoboy, deliveryId, city, from, to, page]);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Operação"
        title="Entregas"
        description="Consulta paginada das entregas e acesso à timeline completa."
      />
      <Card className="mt-6 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Empresa"
          value={company}
          onChange={(event) => {
            setCompany(event.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="Motoboy"
          value={motoboy}
          onChange={(event) => {
            setMotoboy(event.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="ID da entrega"
          value={deliveryId}
          onChange={(event) => {
            setDeliveryId(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          {Object.entries(deliveryStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as cidades</option>
          <option value="PETROLINA_PE">Petrolina/PE</option>
          <option value="JUAZEIRO_BA">Juazeiro/BA</option>
        </Select>
        <Input
          aria-label="Data inicial"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
        <Button onClick={load}>Aplicar filtros</Button>
      </Card>
      <div className="mt-5">
        {error ? (
          <ErrorCard message={error} retry={load} />
        ) : !result ? (
          <LoadingCards />
        ) : result.items.length === 0 ? (
          <EmptyState
            icon="package"
            title="Nenhuma entrega"
            description="Não há registros para os filtros selecionados."
          />
        ) : (
          <>
            <div className="grid gap-3">
              {result.items.map((delivery) => (
                <Link key={delivery.id} href={`/admin/entregas/${delivery.id}`}>
                  <Card className="p-5 transition hover:border-brand/30">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-bold">{delivery.companyName}</p>
                        <p className="mt-1 text-xs text-muted">
                          ID {delivery.id} · {date(delivery.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          delivery.status === "COMPLETED"
                            ? "success"
                            : delivery.status === "DISPUTED"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {deliveryStatusLabel[delivery.status]}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm">
                      {delivery.pickupSummary} → {delivery.destinationSummary}
                    </p>
                    <p className="mt-2 text-sm text-muted">
                      Motoboy: {delivery.motoboyName ?? "Não vinculado"} ·{" "}
                      {money(delivery.offeredPrice)}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
            <Pager
              page={result.page}
              totalPages={result.totalPages}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}

export function AdminDeliveryDetails({ id }: { id: string }) {
  const [delivery, setDelivery] = useState<AdminDeliveryDetail | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ delivery: AdminDeliveryDetail }>(`/api/admin/deliveries/${id}`)
      .then((value) => setDelivery(value.delivery))
      .catch((reason) => setError(reason.message));
  }, [id]);
  useEffect(load, [load]);
  if (error) return <ErrorCard message={error} retry={load} />;
  if (!delivery) return <LoadingCards />;
  return (
    <>
      <DashboardHeader
        eyebrow="Entrega"
        title={delivery.companyName}
        description={`ID ${delivery.id}`}
        action={<Badge>{deliveryStatusLabel[delivery.status]}</Badge>}
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">Resumo</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p>
              <strong>Motoboy:</strong>{" "}
              {delivery.motoboyName ?? "Não vinculado"}
            </p>
            <p>
              <strong>Coleta:</strong> {delivery.pickupSummary}
            </p>
            <p>
              <strong>Destino:</strong> {delivery.destinationSummary}
            </p>
            <p>
              <strong>Valor informado:</strong> {money(delivery.offeredPrice)}
            </p>
            <p>
              <strong>Pagamento:</strong> {delivery.paymentMethod}
            </p>
            <p>
              <strong>Observações:</strong> {delivery.notes ?? "Nenhuma"}
            </p>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">Timeline</h2>
          <ol className="mt-5 space-y-5">
            {delivery.history.map((item) => (
              <li key={item.id} className="border-l-2 border-brand/25 pl-4">
                <p className="font-bold">
                  {deliveryStatusLabel[item.newStatus]}
                </p>
                <p className="text-xs text-muted">
                  {date(item.createdAt)} · {item.actorName ?? "Sistema"}{" "}
                  {item.actorRole ? `(${roleLabel[item.actorRole]})` : ""}
                </p>
                {item.note && <p className="mt-1 text-sm">{item.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">
            Avaliações vinculadas
          </h2>
          {delivery.ratings.length ? (
            <div className="mt-4 space-y-4">
              {delivery.ratings.map((rating) => (
                <div key={rating.id}>
                  <p className="font-bold">
                    {rating.score} ★ · {rating.reviewerName} →{" "}
                    {rating.reviewedName}
                  </p>
                  {rating.comment && (
                    <p className="mt-1 text-sm text-muted">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Nenhuma avaliação.</p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">
            Denúncias vinculadas
          </h2>
          {delivery.reports.length ? (
            <div className="mt-4 space-y-3">
              {delivery.reports.map((report) => (
                <Link
                  className="block font-bold text-brand"
                  key={report.id}
                  href={`/admin/denuncias/${report.id}`}
                >
                  {reportCategoryLabel[report.category]} ·{" "}
                  {reportStatusLabel[report.status]}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Nenhuma denúncia.</p>
          )}
        </Card>
      </div>
    </>
  );
}

export function AdminReports() {
  const [result, setResult] = useState<Paginated<AdminReportListItem> | null>(
    null,
  );
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<Paginated<AdminReportListItem>>(
      `/api/admin/reports?${queryString({ status, category, from, to, page, pageSize: 20 })}`,
    )
      .then(setResult)
      .catch((reason) => setError(reason.message));
  }, [status, category, from, to, page]);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Moderação"
        title="Denúncias"
        description="Análise manual sem suspensão ou punição automática."
      />
      <Card className="mt-6 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_12rem_12rem_auto]">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          {Object.entries(reportStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as categorias</option>
          {Object.entries(reportCategoryLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Data inicial"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          aria-label="Data final"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
        <Button onClick={load}>Filtrar</Button>
      </Card>
      <div className="mt-5">
        {error ? (
          <ErrorCard message={error} retry={load} />
        ) : !result ? (
          <LoadingCards />
        ) : result.items.length === 0 ? (
          <EmptyState
            icon="shield"
            title="Nenhuma denúncia"
            description="Não há registros para estes filtros."
          />
        ) : (
          <>
            <div className="grid gap-3">
              {result.items.map((report) => (
                <Link key={report.id} href={`/admin/denuncias/${report.id}`}>
                  <Card className="p-5 transition hover:border-brand/30">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {reportCategoryLabel[report.category]}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {report.reporterName} · {date(report.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          report.status === "OPEN"
                            ? "warning"
                            : report.status === "RESOLVED"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {reportStatusLabel[report.status]}
                      </Badge>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm text-muted">
                      {report.description}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
            <Pager
              page={result.page}
              totalPages={result.totalPages}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}

export function AdminReportDetails({ id }: { id: string }) {
  const [report, setReport] = useState<AdminReportListItem | null>(null);
  const [error, setError] = useState("");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    api<{ report: AdminReportListItem }>(`/api/admin/reports/${id}`)
      .then((value) => {
        setReport(value.report);
        setNotes(value.report.adminNotes ?? "");
      })
      .catch((reasonValue) => setError(reasonValue.message));
  }, [id]);
  useEffect(load, [load]);
  async function submit() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/admin/reports/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target, reason, adminNotes: notes }),
      });
      setTarget("");
      setReason("");
      load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }
  if (error && !report) return <ErrorCard message={error} retry={load} />;
  if (!report) return <LoadingCards />;
  const actions =
    report.status === "OPEN"
      ? [["UNDER_REVIEW", "Iniciar análise"]]
      : report.status === "UNDER_REVIEW"
        ? [
            ["RESOLVED", "Resolver"],
            ["DISMISSED", "Descartar"],
          ]
        : [["UNDER_REVIEW", "Reabrir análise"]];
  return (
    <>
      <DashboardHeader
        eyebrow="Denúncia"
        title={reportCategoryLabel[report.category]}
        description={`Aberta por ${report.reporterName} em ${date(report.createdAt)}`}
        action={
          <Badge variant="warning">{reportStatusLabel[report.status]}</Badge>
        }
      />
      {error && (
        <Card className="mt-5 border-red-200 p-4 text-red-700">{error}</Card>
      )}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">Relato</h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">
            {report.description}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-muted">Denunciado</dt>
              <dd>{report.reportedName ?? "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted">Entrega</dt>
              <dd>
                {report.deliveryId ? (
                  <Link
                    className="text-brand"
                    href={`/admin/entregas/${report.deliveryId}`}
                  >
                    {report.deliveryId}
                  </Link>
                ) : (
                  "Não vinculada"
                )}
              </dd>
            </div>
          </dl>
          {report.adminNotes && (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-800">
                Nota administrativa privada
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {report.adminNotes}
              </p>
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-xl font-extrabold">Moderar</h2>
          <p className="mt-2 text-sm text-muted">
            A mudança exige motivo e gera registro imutável.
          </p>
          <div className="mt-5 grid gap-3">
            {actions.map(([value, label]) => (
              <Button
                key={value}
                variant={value === "DISMISSED" ? "outline" : "primary"}
                onClick={() => setTarget(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
      <Dialog
        open={Boolean(target)}
        onClose={() => setTarget("")}
        title="Confirmar mudança de status"
        description={`Novo status: ${reportStatusLabel[target] ?? ""}`}
      >
        <FormField label="Motivo" htmlFor="report-reason">
          <textarea
            id="report-reason"
            className="min-h-24 w-full rounded-2xl border border-line p-3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        <div className="mt-4">
          <FormField
            label="Notas administrativas privadas"
            htmlFor="admin-notes"
          >
            <textarea
              id="admin-notes"
              className="min-h-24 w-full rounded-2xl border border-line p-3"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </FormField>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setTarget("")}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={submit}>
            {saving ? "Salvando..." : "Confirmar"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function AdminAudit() {
  const [result, setResult] = useState<Paginated<AdminAuditItem> | null>(null);
  const [actionType, setActionType] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<Paginated<AdminAuditItem>>(
      `/api/admin/audit?${queryString({ actionType, page, pageSize: 20 })}`,
    )
      .then(setResult)
      .catch((reason) => setError(reason.message));
  }, [actionType, page]);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Segurança"
        title="Auditoria"
        description="Histórico administrativo somente leitura. Nenhum registro pode ser editado pela interface."
      />
      <Card className="mt-6 flex flex-wrap gap-3 p-4">
        <Select
          className="max-w-sm"
          value={actionType}
          onChange={(event) => {
            setActionType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as ações</option>
          {Object.entries(actionLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button onClick={load}>Filtrar</Button>
      </Card>
      <div className="mt-5">
        {error ? (
          <ErrorCard message={error} retry={load} />
        ) : !result ? (
          <LoadingCards />
        ) : result.items.length === 0 ? (
          <EmptyState
            icon="history"
            title="Auditoria vazia"
            description="As ações de moderação aparecerão aqui."
          />
        ) : (
          <>
            <div className="grid gap-3">
              {result.items.map((item) => (
                <Card key={item.id} className="p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <p className="font-bold">{actionLabel[item.actionType]}</p>
                    <time className="text-xs text-muted">
                      {date(item.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Admin: {item.adminName} · Alvo:{" "}
                    {item.targetName ?? "Denúncia/plataforma"}
                  </p>
                  {item.reason && (
                    <p className="mt-3 text-sm">Motivo: {item.reason}</p>
                  )}
                </Card>
              ))}
            </div>
            <Pager
              page={result.page}
              totalPages={result.totalPages}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
