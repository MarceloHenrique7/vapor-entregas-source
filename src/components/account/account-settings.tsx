"use client";

/* eslint-disable react-hooks/set-state-in-effect -- account data is synchronized from the authenticated API */

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountOverview } from "@/server/account/types";

const cityLabel: Record<string, string> = {
  PETROLINA_PE: "Petrolina/PE",
  JUAZEIRO_BA: "Juazeiro/BA",
};
async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body.error ?? "Não foi possível concluir a operação.";
}

export function AccountSettings() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountOverview | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const load = useCallback(() => {
    setError("");
    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json();
      })
      .then((body) => setAccount(body.account))
      .catch((reason) => setError(reason.message));
  }, []);
  useEffect(load, [load]);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(target);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        fantasyName:
          account?.role === "COMPANY" ? form.get("fantasyName") : undefined,
        vehiclePlate:
          account?.role === "MOTOBOY" ? form.get("vehiclePlate") : undefined,
        currentPassword: form.get("currentPassword"),
      }),
    });
    if (!response.ok) setError(await responseError(response));
    else {
      const body = await response.json();
      setAccount(body.account);
      setSuccess("Dados atualizados com segurança.");
      target.reset();
    }
    setLoading(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    setLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(target);
    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
        passwordConfirmation: form.get("passwordConfirmation"),
      }),
    });
    if (!response.ok) setError(await responseError(response));
    else {
      setSuccess("Senha alterada. As outras sessões foram encerradas.");
      target.reset();
      router.refresh();
    }
    setLoading(false);
  }

  async function exportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("currentPassword") }),
    });
    if (!response.ok) setError(await responseError(response));
    else {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vapor-entregas-meus-dados.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      setSuccess("Arquivo de dados gerado no seu dispositivo.");
    }
    setLoading(false);
  }

  async function closeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        confirmation: form.get("confirmation"),
      }),
    });
    if (!response.ok) {
      setError(await responseError(response));
      setLoading(false);
      return;
    }
    window.dispatchEvent(new Event("vapor-entregas:logout"));
    window.dispatchEvent(new Event("entregavale:logout"));
    router.push("/?account=closed");
    router.refresh();
  }

  if (!account && !error)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  return (
    <>
      <DashboardHeader
        eyebrow="Privacidade e segurança"
        title="Configurações da conta"
        description="Gerencie seus dados, senha, exportação e encerramento da conta."
      />
      {error && (
        <Card
          className="mt-5 border-red-200 p-4 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </Card>
      )}
      {success && (
        <Card className="mt-5 border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
          {success}
        </Card>
      )}
      {account && (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">
                Dados básicos
              </h2>
              <Badge variant="success">
                {account.role === "COMPANY" ? "Empresa" : "Motoboy"}
              </Badge>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-bold text-muted">E-mail</dt>
                <dd className="break-all">{account.email}</dd>
              </div>
              <div>
                <dt className="font-bold text-muted">Cidade</dt>
                <dd>{account.city ? cityLabel[account.city] : "—"}</dd>
              </div>
              <div>
                <dt className="font-bold text-muted">Documento</dt>
                <dd>{account.documentMasked ?? "—"}</dd>
              </div>
              {account.birthDate && (
                <div>
                  <dt className="font-bold text-muted">Nascimento</dt>
                  <dd>
                    {new Intl.DateTimeFormat("pt-BR", {
                      timeZone: "UTC",
                    }).format(new Date(`${account.birthDate}T00:00:00Z`))}
                  </dd>
                </div>
              )}
              {account.role === "MOTOBOY" && account.vehiclePlate && (
                <div>
                  <dt className="font-bold text-muted">Placa da moto</dt>
                  <dd>{account.vehiclePlate}</dd>
                </div>
              )}
            </dl>
            <form className="mt-6 space-y-4" onSubmit={updateProfile}>
              <FormField label="Nome" htmlFor="account-name" required>
                <Input
                  id="account-name"
                  name="name"
                  defaultValue={account.name}
                  required
                />
              </FormField>
              {account.role === "COMPANY" && (
                <FormField
                  label="Nome fantasia"
                  htmlFor="fantasy-name"
                  required
                >
                  <Input
                    id="fantasy-name"
                    name="fantasyName"
                    defaultValue={account.fantasyName ?? ""}
                    required
                  />
                </FormField>
              )}
              <FormField label="Telefone" htmlFor="account-phone" required>
                <Input
                  id="account-phone"
                  name="phone"
                  defaultValue={account.phone}
                  required
                />
              </FormField>
              {account.role === "MOTOBOY" && (
                <FormField
                  label="Placa da moto"
                  htmlFor="account-vehicle-plate"
                  hint="Campo opcional. Ex.: ABC1D23"
                >
                  <Input
                    id="account-vehicle-plate"
                    name="vehiclePlate"
                    defaultValue={account.vehiclePlate ?? ""}
                    autoComplete="off"
                    placeholder="ABC1D23"
                    maxLength={10}
                  />
                </FormField>
              )}
              <FormField
                label="Senha atual para confirmar"
                htmlFor="profile-password"
                required
              >
                <Input
                  id="profile-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </FormField>
              <Button type="submit" disabled={loading}>
                Salvar dados
              </Button>
            </form>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-extrabold">
              Alterar senha
            </h2>
            <p className="mt-2 text-sm text-muted">
              Use pelo menos 12 caracteres, incluindo maiúscula, minúscula e
              número.
            </p>
            <form className="mt-5 space-y-4" onSubmit={changePassword}>
              <FormField
                label="Senha atual"
                htmlFor="password-current"
                required
              >
                <Input
                  id="password-current"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </FormField>
              <FormField label="Nova senha" htmlFor="password-new" required>
                <Input
                  id="password-new"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </FormField>
              <FormField
                label="Confirmar nova senha"
                htmlFor="password-confirmation"
                required
              >
                <Input
                  id="password-confirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </FormField>
              <Button type="submit" disabled={loading}>
                Alterar senha
              </Button>
            </form>
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-extrabold">
              Privacidade e documentos
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Baixe uma cópia JSON dos seus dados. A senha atual é exigida e o
              arquivo é gerado diretamente nesta sessão.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => setExportOpen(true)}>
                Exportar meus dados
              </Button>
              <Link
                href="/termos"
                className="text-sm font-bold text-brand underline"
              >
                Termos de Uso
              </Link>
              <Link
                href="/privacidade"
                className="text-sm font-bold text-brand underline"
              >
                Política de Privacidade
              </Link>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                Aceites registrados
              </p>
              {account.legalAcceptances.map((acceptance) => (
                <p
                  className="mt-2 text-sm"
                  key={`${acceptance.documentType}-${acceptance.documentVersion}`}
                >
                  {acceptance.documentType === "TERMS_OF_USE"
                    ? "Termos"
                    : "Privacidade"}{" "}
                  v{acceptance.documentVersion} ·{" "}
                  {new Date(acceptance.acceptedAt).toLocaleDateString("pt-BR")}
                </p>
              ))}
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <p className="font-display text-lg font-extrabold text-ink">
                Vapor no seu celular
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Instale para abrir mais rápido e usar com aparência de
                aplicativo.
              </p>
              <InstallAppButton className="mt-4 w-full sm:w-auto" />
            </div>
          </Card>
          <Card className="border-red-200 p-6">
            <h2 className="font-display text-xl font-extrabold text-red-800">
              Encerrar minha conta
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Esta ação impedirá acessos futuros. Identificadores serão
              anonimizados quando possível, enquanto entregas, avaliações,
              denúncias e auditorias que precisem ser preservadas continuarão
              retidas para análise contextual.
            </p>
            <Button
              className="mt-5"
              variant="danger"
              onClick={() => setCloseOpen(true)}
            >
              Solicitar encerramento
            </Button>
          </Card>
        </div>
      )}
      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Exportar meus dados"
        description="Confirme sua senha para gerar o arquivo."
      >
        <form onSubmit={exportData}>
          <FormField label="Senha atual" htmlFor="export-password" required>
            <Input
              id="export-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setExportOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Gerando..." : "Gerar JSON"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Encerrar conta permanentemente?"
        description="Não é possível encerrar a conta com entrega operacional pendente."
      >
        <form onSubmit={closeAccount} className="space-y-4">
          <FormField label="Senha atual" htmlFor="close-password" required>
            <Input
              id="close-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>
          <FormField
            label="Digite “ENCERRAR MINHA CONTA”"
            htmlFor="close-confirmation"
            required
          >
            <Input
              id="close-confirmation"
              name="confirmation"
              autoComplete="off"
              required
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setCloseOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? "Encerrando..." : "Confirmar encerramento"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
