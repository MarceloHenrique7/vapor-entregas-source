"use client";

/* eslint-disable react-hooks/set-state-in-effect -- protected API data is synchronized after mount */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface Connector {
  code: "GENERIC_WEBHOOK" | "MANUAL_CSV" | "IFOOD";
  label: string;
  status: string;
  keyPrefix: string | null;
  webhookPath: string | null;
  connectedAt: string | null;
  message: string;
}
interface ImportedOrder {
  id: string;
  provider: string;
  externalId: string;
  channel: string;
  externalStatus: string | null;
  eligibleForOwnDelivery: boolean;
  destinationAddress: string | null;
  destinationNumber: string | null;
  destinationNeighborhood: string | null;
  status: string;
  deliveryId: string | null;
  createdAt: string;
}
interface CsvRow {
  rowNumber: number;
  externalId: string;
  channel: string;
  destinationAddress?: string;
  destinationNumber?: string;
  destinationNeighborhood?: string;
  valid: boolean;
  errors: string[];
}

const statusLabel: Record<string, string> = {
  NOT_CONNECTED: "Não conectado",
  CONNECTED: "Conectado",
  AWAITING_AUTHORIZATION: "Aguardando autorização/homologação",
  UNAVAILABLE: "Indisponível",
  REVOKED: "Revogado",
};

export function IntegrationsDashboard() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [orders, setOrders] = useState<ImportedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [integrationResponse, ordersResponse] = await Promise.all([
        fetch("/api/company/integrations", { cache: "no-store" }),
        fetch("/api/company/integrations/orders", { cache: "no-store" }),
      ]);
      const integrationPayload = (await integrationResponse.json()) as {
        integrations?: { connectors: Connector[] };
        error?: string;
      };
      const ordersPayload = (await ordersResponse.json()) as {
        orders?: ImportedOrder[];
        error?: string;
      };
      if (!integrationResponse.ok || !integrationPayload.integrations)
        throw new Error(
          integrationPayload.error ?? "Falha ao carregar integrações.",
        );
      if (!ordersResponse.ok || !ordersPayload.orders)
        throw new Error(
          ordersPayload.error ?? "Falha ao carregar pedidos importados.",
        );
      setConnectors(integrationPayload.integrations.connectors);
      setOrders(ordersPayload.orders);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha ao carregar integrações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCredential() {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/company/integrations", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        credential?: { secret: string };
        error?: string;
      };
      if (!response.ok || !payload.credential) {
        setMessage(payload.error ?? "Não foi possível gerar a credencial.");
        return;
      }
      setSecret(payload.credential.secret);
      setMessage(
        "Credencial criada. Copie o segredo agora; ele não voltará a ser exibido.",
      );
      await load();
    } finally {
      setWorking(false);
    }
  }

  async function revokeCredential() {
    if (
      !window.confirm(
        "Revogar o webhook atual? O parceiro deixará de enviar pedidos imediatamente.",
      )
    )
      return;
    setWorking(true);
    const response = await fetch("/api/company/integrations", {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Webhook revogado."
        : (payload.error ?? "Não foi possível revogar."),
    );
    setSecret(null);
    await load();
    setWorking(false);
  }

  async function importCsv(confirm: boolean) {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/company/integrations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, confirm }),
      });
      const payload = (await response.json()) as {
        result?: {
          rows: CsvRow[];
          confirmed: boolean;
          created?: number;
          duplicates?: number;
          error?: string;
        };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        setMessage(payload.error ?? "Não foi possível revisar o CSV.");
        return;
      }
      setPreview(payload.result.rows);
      if (payload.result.error) setMessage(payload.result.error);
      else if (payload.result.confirmed) {
        setMessage(
          `${payload.result.created ?? 0} pedido(s) importado(s); ${payload.result.duplicates ?? 0} duplicado(s) ignorado(s).`,
        );
        setCsv("");
        setPreview([]);
        await load();
      } else
        setMessage(
          "Prévia pronta. Confira todas as linhas antes de confirmar.",
        );
    } catch {
      setMessage("Falha de conexão ao processar o arquivo.");
    } finally {
      setWorking(false);
    }
  }

  const webhook = connectors.find((item) => item.code === "GENERIC_WEBHOOK");
  const webhookUrl = webhook?.webhookPath
    ? typeof window === "undefined"
      ? webhook.webhookPath
      : `${window.location.origin}${webhook.webhookPath}`
    : "";

  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Automação controlada"
        title="Integrações de pedidos"
        description="Importe pedidos para revisão. Nenhum conector publica ou aceita uma corrida automaticamente."
      />
      {error && (
        <Card className="p-5 text-sm font-semibold text-red-700" role="alert">
          {error}
        </Card>
      )}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {connectors.map((connector) => (
            <Card key={connector.code} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-extrabold">
                  {connector.label}
                </h2>
                <Badge
                  variant={
                    connector.status === "CONNECTED" ? "success" : "neutral"
                  }
                >
                  {statusLabel[connector.status] ?? connector.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {connector.message}
              </p>
              {connector.code === "GENERIC_WEBHOOK" && (
                <div className="mt-5 space-y-3">
                  {webhookUrl && (
                    <div className="rounded-xl bg-canvas p-3 text-xs break-all">
                      {webhookUrl}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {webhookUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void navigator.clipboard.writeText(webhookUrl)
                        }
                      >
                        Copiar webhook
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => void createCredential()}
                      disabled={working}
                    >
                      {connector.status === "CONNECTED"
                        ? "Girar segredo"
                        : "Criar webhook"}
                    </Button>
                    {connector.status === "CONNECTED" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void revokeCredential()}
                        disabled={working}
                      >
                        Revogar
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {connector.code === "IFOOD" && (
                <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  É necessário aplicativo, credenciais, autorização das lojas e
                  homologação no portal oficial do iFood. Não há conexão ativa
                  neste ambiente.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {(secret || message) && (
        <Card className="border-brand/25 p-5" aria-live="polite">
          {message && (
            <p className="text-sm font-semibold text-ink">{message}</p>
          )}
          {secret && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-ink p-3 text-xs text-white">
                {secret}
              </code>
              <Button
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(secret)}
              >
                Copiar segredo
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="p-5 sm:p-7">
        <h2 className="font-display text-xl font-extrabold">Importar CSV</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Colunas: external_id, canal, rua, numero, bairro, cidade, estado, cep,
          telefone, complemento, referencia e observacao. Máximo de 200 linhas.
        </p>
        <input
          className="mt-5 block w-full rounded-2xl border border-line bg-white p-3 text-sm"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((content) => {
              setCsv(content);
              setPreview([]);
              setMessage("");
            });
          }}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!csv || working}
            onClick={() => void importCsv(false)}
          >
            Revisar arquivo
          </Button>
          {preview.length > 0 && (
            <Button
              disabled={working || preview.some((row) => !row.valid)}
              onClick={() => void importCsv(true)}
            >
              Confirmar importação
            </Button>
          )}
        </div>
        {preview.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-canvas">
                <tr>
                  <th className="p-3">Linha</th>
                  <th className="p-3">ID externo</th>
                  <th className="p-3">Destino</th>
                  <th className="p-3">Canal</th>
                  <th className="p-3">Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.map((row) => (
                  <tr key={`${row.rowNumber}-${row.externalId}`}>
                    <td className="p-3">{row.rowNumber}</td>
                    <td className="p-3">{row.externalId}</td>
                    <td className="p-3">
                      {row.destinationAddress}, {row.destinationNumber} ·{" "}
                      {row.destinationNeighborhood}
                    </td>
                    <td className="p-3">{row.channel}</td>
                    <td
                      className={`p-3 font-semibold ${row.valid ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {row.valid ? "Pronto" : row.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold">
            Pedidos importados
          </h2>
          <p className="mt-1 text-sm text-muted">
            Revise os dados e confirme manualmente a criação da oportunidade.
          </p>
        </div>
        {!orders.length ? (
          <EmptyState
            icon="package"
            title="Nenhum pedido importado"
            description="Use o CSV ou configure um webhook de parceiro."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-canvas">
                <tr>
                  <th className="px-5 py-4">Origem</th>
                  <th className="px-5 py-4">ID externo</th>
                  <th className="px-5 py-4">Destino</th>
                  <th className="px-5 py-4">Situação</th>
                  <th className="px-5 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-4">{order.channel}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {order.externalId}
                    </td>
                    <td className="px-5 py-4">
                      {order.destinationAddress
                        ? `${order.destinationAddress}, ${order.destinationNumber ?? "s/n"}`
                        : "Endereço indisponível"}
                      <span className="block text-xs text-muted">
                        {order.destinationNeighborhood}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {order.deliveryId
                        ? "Convertido em entrega"
                        : order.status === "READY"
                          ? "Pronto para revisão"
                          : order.eligibleForOwnDelivery
                            ? "Dados incompletos"
                            : "Logística da plataforma externa"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {order.status === "READY" && !order.deliveryId ? (
                        <Link
                          className={buttonStyles({ size: "sm" })}
                          href={`/app/empresa/entregas/nova?importado=${order.id}`}
                        >
                          Solicitar motoboy
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">Sem ação</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 text-sm leading-6 text-muted">
        <strong className="text-ink">Webhook seguro:</strong> o parceiro deve
        enviar os cabeçalhos <code>X-Vapor-Event-Id</code>,{" "}
        <code>X-Vapor-Timestamp</code> e <code>X-Vapor-Signature</code>. A
        assinatura é HMAC-SHA256 do texto{" "}
        <code>timestamp.corpo_json_exato</code>. Eventos repetidos são ignorados
        por ID.
      </Card>
    </div>
  );
}
