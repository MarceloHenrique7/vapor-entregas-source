import { DashboardHeader } from "@/components/dashboard/dashboard-elements";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const content: Record<string, { title: string; description: string }> = {
  entregas: {
    title: "Entregas",
    description: "Nova entrega, andamento e conclusão serão organizados aqui.",
  },
  motoboys: {
    title: "Motoboys",
    description:
      "Disponibilidade próxima será apresentada sem expor posições individuais.",
  },
  historico: {
    title: "Histórico",
    description: "Entregas anteriores serão filtradas e consultadas aqui.",
  },
  favoritos: {
    title: "Favoritos",
    description: "Motoboys favoritos poderão ser organizados neste espaço.",
  },
  assinatura: {
    title: "Assinatura",
    description: "Plano, situação e vencimento serão exibidos aqui.",
  },
  perfil: {
    title: "Perfil da empresa",
    description: "Dados do estabelecimento e coleta serão gerenciados aqui.",
  },
  configuracoes: {
    title: "Configurações",
    description: "Preferências, privacidade e suporte serão reunidos aqui.",
  },
};
export default async function CompanySection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const key = section[0] ?? "";
  const isNew = section[0] === "entregas" && section[1] === "nova";
  const item = isNew
    ? {
        title: "Nova entrega",
        description:
          "O formulário real será implementado junto com mapa e fluxo de corridas.",
      }
    : (content[key] ?? {
        title: "Em construção",
        description: "Este espaço será implementado nas próximas etapas.",
      });
  return (
    <div className="space-y-7">
      <DashboardHeader
        eyebrow="Área da empresa"
        title={item.title}
        description={item.description}
      />
      <Card>
        <EmptyState
          icon={
            isNew
              ? "plus"
              : key === "motoboys"
                ? "users"
                : key === "favoritos"
                  ? "heart"
                  : "sparkles"
          }
          title="Espaço preparado"
          description="A estrutura visual está pronta. Nenhuma entrega, busca, mapa, favorito ou pagamento funcional foi ativado."
        />
      </Card>
    </div>
  );
}
