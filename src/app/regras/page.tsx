import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import {
  OPERATIONAL_RULES,
  OPERATIONAL_RULES_VERSION,
} from "@/config/operational-rules";

export const metadata: Metadata = { title: "Regras operacionais" };

export default function OperationalRulesPage() {
  return (
    <LegalPage
      title="Regras operacionais e adicionais"
      version={OPERATIONAL_RULES_VERSION}
      intro="Estas regras explicam como condições especiais devem ser informadas entre empresas e motoboys independentes. Elas não criam jornada, exclusividade ou obrigação de aceitar oportunidades e precisam de revisão jurídica profissional antes do lançamento comercial."
      sections={[
        {
          title: "Transparência antes do aceite",
          content:
            "A empresa deve informar as condições relevantes que conhecer antes de publicar. O motoboy visualiza os adicionais antes de aceitar e, quando existirem condições especiais, confirma que leu as informações. Essa confirmação registra ciência, não retira sua liberdade de ignorar a oportunidade.",
        },
        ...OPERATIONAL_RULES,
        {
          title: "Condições surgidas durante a entrega",
          content:
            "Empresa ou motoboy pode registrar uma nova condição durante uma entrega operacional. O registro preserva tipo, descrição, valor informativo, autor e horário. A outra parte pode confirmar ciência ou rejeitar; não existe edição silenciosa do valor original da oportunidade.",
        },
        {
          title: "Pagamento direto e ausência de garantia",
          content:
            "A Vapor Entregas não recebe o valor da corrida nem dos adicionais, não mantém carteira e não realiza repasse. Valor, forma e momento do pagamento são acertados diretamente entre as partes. O registro na plataforma não garante pagamento, conclusão ou ausência de divergências.",
        },
      ]}
    />
  );
}
