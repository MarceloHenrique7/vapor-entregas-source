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
  COMPANY_PRO_CHANGED: "Acesso ao Vapor Gestão Pro alterado",
  MOTOBOY_PLAN_GRANTED: "Plano manual de motoboy concedido",
  MOTOBOY_PLAN_EXTENDED: "Plano manual de motoboy estendido",
  MOTOBOY_PLAN_REVOKED: "Plano manual de motoboy revogado",
  COMPANY_PRO_ENABLED: "Gestão Pro habilitado",
  COMPANY_PRO_EXTENDED: "Gestão Pro estendido",
  COMPANY_PRO_DISABLED: "Gestão Pro desabilitado",
  REVIEW_HIDDEN: "Avaliação ocultada",
  REVIEW_RESTORED: "Avaliação restaurada",
  REPORT_RESOLVED: "Denúncia resolvida",
  SETTING_CHANGED: "Configuração alterada",
  ADMIN_OVERRIDE: "Correção administrativa excepcional",
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
  const [period, setPeriod] = useState("30d");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<{ metrics: AdminDashboardMetrics }>(
      `/api/admin/dashboard?period=${period}`,
    )
      .then((value) => setMetrics(value.metrics))
      .catch((reason) => setError(reason.message));
  }, [period]);
  useEffect(load, [load]);
  return (
    <>
      <DashboardHeader
        eyebrow="Administração"
        title="Visão geral"
        description="Indicadores operacionais e de moderação, sem expor dados privados desnecessários."
      />
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm font-bold">Período dos indicadores financeiros</p>
        <Select
          aria-label="Período do dashboard"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          <option value="today">Hoje</option>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="month">Mês atual</option>
        </Select>
      </Card>
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
              icon="wallet"
              label="Motoboys com acesso"
              value={String(metrics.motoboysActivePlan)}
              note={`${metrics.motoboysWithoutPlan} sem plano · ${metrics.motoboysExpired} expirados`}
            />
            <StatCard
              icon="building"
              label="Empresas Pro"
              value={String(metrics.companiesPro)}
              note={`${metrics.companiesFree} no plano gratuito`}
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
              icon="wallet"
              label="VaporPay pendente"
              value={String(metrics.vaporPayPending)}
              note={`${money(metrics.vaporPayPendingValue)} declarado · ${metrics.vaporPayDisputed} divergentes`}
            />
            <StatCard
              icon="sparkles"
              label="Receita confirmada"
              value={money(metrics.confirmedRevenue)}
              note="Somente pagamentos reais aprovados"
            />
            <StatCard
              icon="history"
              label="Acessos vencendo"
              value={String(metrics.expiringAccess)}
              note="Próximos 7 dias"
            />
            <StatCard
              icon="users"
              label="Cadastros recentes"
              value={String(metrics.recentRegistrations)}
              note="Últimos 7 dias"
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

export function AdminUsers({
  fixedRole,
  title = "Usuários",
}: {
  fixedRole?: "MOTOBOY" | "COMPANY";
  title?: string;
} = {}) {
  const [result, setResult] = useState<Paginated<AdminUserListItem> | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(fixedRole ?? "");
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
        title={title}
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
        {fixedRole ? (
          <div className="flex items-center rounded-2xl border border-line bg-canvas px-4 text-sm font-bold">
            {roleLabel[fixedRole]}
          </div>
        ) : (
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
        )}
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
  const [accessAction, setAccessAction] = useState<
    | "MOTOBOY_GRANT"
    | "MOTOBOY_EXTEND"
    | "MOTOBOY_REVOKE"
    | "PRO_ENABLE"
    | "PRO_EXTEND"
    | "PRO_DISABLE"
    | null
  >(null);
  const [accessReason, setAccessReason] = useState("");
  const [accessDays, setAccessDays] = useState("30");
  const [indefinite, setIndefinite] = useState(false);
  const [grantReasonType, setGrantReasonType] = useState("COURTESY");
  const [proSource, setProSource] = useState("ADMIN_GRANTED");
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
  async function submitAccess() {
    if (!user || !accessAction) return;
    setSaving(true);
    setError("");
    try {
      const motoboyAction = accessAction.startsWith("MOTOBOY_");
      if (motoboyAction) {
        const action = accessAction.replace("MOTOBOY_", "");
        await api(`/api/admin/users/${id}/motoboy-plan`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            planId: action === "GRANT" ? user.motoboyPlan?.id : undefined,
            days: action === "REVOKE" ? undefined : Number(accessDays),
            reasonType: action === "GRANT" ? grantReasonType : undefined,
            reason: accessReason,
          }),
        });
        setSuccess(
          action === "GRANT"
            ? "Acesso manual concedido sem criar pagamento ou receita."
            : action === "EXTEND"
              ? "Acesso manual estendido."
              : "Acesso manual revogado; o histórico foi preservado.",
        );
      } else {
        const action = accessAction.replace("PRO_", "");
        await api(`/api/admin/users/${id}/company-pro`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            days:
              action === "DISABLE" || indefinite
                ? undefined
                : Number(accessDays),
            indefinite,
            source: action === "ENABLE" ? proSource : undefined,
            reason: accessReason,
          }),
        });
        setSuccess(
          action === "ENABLE"
            ? "Gestão Pro liberado administrativamente, sem gerar receita."
            : action === "EXTEND"
              ? "Acesso ao Gestão Pro estendido."
              : "Acesso ao Gestão Pro removido; os dados foram preservados.",
        );
      }
      setAccessAction(null);
      setAccessReason("");
      setAccessDays("30");
      setIndefinite(false);
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
          {user.role === "COMPANY" && user.companyProEnabled !== null && (
            <div className="mb-6 border-b border-line pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold">
                    Vapor Gestão Pro
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Liberação piloto sem preço ou checkout.
                  </p>
                </div>
                <Badge
                  variant={user.companyProEffective ? "success" : "neutral"}
                >
                  {user.companyProEffective ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {user.companyProEnabledAt && (
                <p className="mt-3 text-xs text-muted">
                  Liberado em {date(user.companyProEnabledAt)} · vencimento{" "}
                  {date(user.companyProExpiresAt)}
                </p>
              )}
              <div className="mt-4 grid gap-2">
                {!user.companyProEffective ? (
                  <Button onClick={() => setAccessAction("PRO_ENABLE")}>
                    Liberar Pro
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setAccessAction("PRO_EXTEND")}>
                      Estender Pro
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setAccessAction("PRO_DISABLE")}
                    >
                      Remover Pro
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          {user.role === "MOTOBOY" && user.motoboyPlan && (
            <div className="mb-6 border-b border-line pb-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-extrabold">
                    Plano {user.motoboyPlan.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Pago e manual são históricos separados.
                  </p>
                </div>
                <Badge
                  variant={
                    user.motoboyManualAccess?.status === "ACTIVE"
                      ? "success"
                      : "neutral"
                  }
                >
                  {user.motoboyManualAccess?.status === "ACTIVE"
                    ? "Manual ativo"
                    : "Sem manual ativo"}
                </Badge>
              </div>
              {user.motoboyPaidAccess && (
                <p className="mt-3 text-xs text-muted">
                  Acesso pago: {user.motoboyPaidAccess.status} · até{" "}
                  {date(user.motoboyPaidAccess.currentPeriodEnd)}
                </p>
              )}
              {user.motoboyManualAccess && (
                <p className="mt-2 text-xs text-muted">
                  Acesso manual: {user.motoboyManualAccess.status} · até{" "}
                  {date(user.motoboyManualAccess.endsAt)}
                </p>
              )}
              <div className="mt-4 grid gap-2">
                {user.motoboyManualAccess?.status === "ACTIVE" ? (
                  <>
                    <Button onClick={() => setAccessAction("MOTOBOY_EXTEND")}>
                      Estender acesso manual
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setAccessAction("MOTOBOY_REVOKE")}
                    >
                      Revogar acesso manual
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setAccessAction("MOTOBOY_GRANT")}>
                    Conceder acesso manual
                  </Button>
                )}
              </div>
            </div>
          )}
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
      <Dialog
        open={Boolean(accessAction)}
        onClose={() => !saving && setAccessAction(null)}
        title={
          accessAction?.includes("REVOKE") || accessAction?.includes("DISABLE")
            ? "Confirmar remoção de acesso"
            : accessAction?.includes("EXTEND")
              ? "Estender acesso"
              : "Conceder acesso"
        }
        description="A ação será transacional e registrada na auditoria. Concessões manuais não criam pagamentos nem receita."
      >
        <div className="space-y-4">
          {accessAction === "MOTOBOY_GRANT" && (
            <FormField label="Tipo do motivo" htmlFor="grant-reason-type">
              <Select
                id="grant-reason-type"
                value={grantReasonType}
                onChange={(event) => setGrantReasonType(event.target.value)}
              >
                <option value="COURTESY">Cortesia</option>
                <option value="TEST">Teste</option>
                <option value="COMPENSATION">Compensação</option>
                <option value="EXTERNAL_PAYMENT">Pagamento externo</option>
                <option value="SUPPORT">Suporte</option>
                <option value="OTHER">Outro</option>
              </Select>
            </FormField>
          )}
          {accessAction === "PRO_ENABLE" && (
            <FormField label="Origem" htmlFor="pro-source">
              <Select
                id="pro-source"
                value={proSource}
                onChange={(event) => setProSource(event.target.value)}
              >
                <option value="ADMIN_GRANTED">Concessão administrativa</option>
                <option value="PROMOTIONAL">Promocional</option>
                <option value="COMPENSATION">Compensação</option>
                <option value="EXTERNAL_PAYMENT">Pagamento externo</option>
                <option value="PARTNER">Parceiro</option>
                <option value="TEST">Teste</option>
              </Select>
            </FormField>
          )}
          {!accessAction?.includes("REVOKE") &&
            !accessAction?.includes("DISABLE") &&
            !(accessAction?.startsWith("PRO_") && indefinite) && (
              <FormField label="Duração em dias" htmlFor="access-days">
                <Input
                  id="access-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={accessDays}
                  onChange={(event) => setAccessDays(event.target.value)}
                />
              </FormField>
            )}
          {accessAction?.startsWith("PRO_") &&
            !accessAction.includes("DISABLE") && (
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={indefinite}
                  onChange={(event) => setIndefinite(event.target.checked)}
                />
                Acesso sem vencimento
              </label>
            )}
          <FormField
            label="Motivo obrigatório"
            htmlFor="access-reason"
            hint="Mínimo de 10 caracteres."
          >
            <textarea
              id="access-reason"
              className="min-h-28 w-full rounded-2xl border border-line p-3"
              value={accessReason}
              onChange={(event) => setAccessReason(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setAccessAction(null)}>
              Cancelar
            </Button>
            <Button
              variant={
                accessAction?.includes("REVOKE") ||
                accessAction?.includes("DISABLE")
                  ? "danger"
                  : "primary"
              }
              disabled={saving || accessReason.trim().length < 10}
              onClick={submitAccess}
            >
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
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
              <strong>Status financeiro:</strong> {delivery.paymentStatus}
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
