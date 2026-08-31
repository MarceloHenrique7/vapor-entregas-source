import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const content: Record<string, { title: string; description: string }> = {
  oportunidades: {
    title: "Oportunidades",
    description: "As oportunidades disponíveis serão exibidas aqui.",
  },
  corrida: {
    title: "Corrida atual",
    description: "O acompanhamento de uma entrega aceita será exibido aqui.",
  },
  historico: {
    title: "Histórico",
    description:
      "Suas entregas concluídas e canceladas serão organizadas aqui.",
  },
  assinatura: {
    title: "Assinatura",
    description:
      "Plano, situação e vencimento da assinatura serão exibidos aqui.",
  },
  perfil: {
    title: "Perfil",
    description:
      "Dados públicos e privados serão gerenciados com acessos separados.",
  },
  configuracoes: {
    title: "Configurações",
    description: "Preferências, privacidade e suporte serão reunidos aqui.",
  },
};
export default async function MotoboySection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const key = section[0] ?? "";
  const item = content[key] ?? {
    title: "Em construção",
    description: "Este espaço será implementado nas próximas etapas.",
  };
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Área do motoboy"
        title={item.title}
        description={item.description}
      />
      <Card>
        <EmptyState
          icon={
            key === "historico"
              ? "history"
              : key === "assinatura"
                ? "wallet"
                : "sparkles"
          }
          title="Espaço preparado"
          description="A estrutura visual está pronta. Nenhuma lógica real de corridas, geolocalização ou pagamento foi ativada."
        />
      </Card>
    </div>
  );
}
