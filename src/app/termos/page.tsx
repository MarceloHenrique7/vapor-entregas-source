import { LegalPage } from "@/components/legal/legal-page";
import { CURRENT_TERMS_VERSION } from "@/config/product";
import { getLegalEnv } from "@/server/config/env";

export default function TermsPage() {
  const { operatorName, contactEmail } = getLegalEnv();
  const operator =
    operatorName ?? "RESPONSÁVEL LEGAL PENDENTE DE DEFINIÇÃO ANTES DA PRODUÇÃO";
  const contact =
    contactEmail ??
    "CANAL DE CONTATO PENDENTE DE CONFIGURAÇÃO ANTES DA PRODUÇÃO";
  return (
    <LegalPage
      title="Termos de Uso"
      version={CURRENT_TERMS_VERSION}
      intro="Estes Termos explicam como funciona a Vapor Entregas, plataforma tecnológica que conecta empresas e entregadores independentes. Esta minuta deve passar por revisão jurídica profissional antes do lançamento comercial."
      sections={[
        {
          title: "1. Apresentação e responsável",
          content: `A Vapor Entregas fornece tecnologia para aproximar empresas que precisam solicitar entregas e motoboys independentes interessados nessas oportunidades. Responsável jurídico informado para produção: ${operator}. O cadastro ou uso representa concordância com estes Termos na versão aceita.`,
        },
        {
          title: "2. Funcionamento da plataforma",
          content:
            "Empresas podem cadastrar ponto de coleta, publicar oportunidades e acompanhar a execução. Motoboys podem ficar online ou offline, visualizar oportunidades e decidir livremente se desejam aceitá-las. A Vapor Entregas organiza informações, estados, avaliações e denúncias, mas não realiza fisicamente a entrega.",
        },
        {
          title: "3. Requisitos de cadastro",
          content:
            "O usuário deve fornecer informações verdadeiras e atuais, manter a senha em sigilo e utilizar apenas a própria conta. O cadastro não constitui certificação de regularidade profissional, verificação de CNH ou aprovação documental.",
        },
        {
          title: "4. Responsabilidades de todos os usuários",
          content:
            "Usuários devem agir com boa-fé, respeitar a lei, manter dados atualizados, proteger a conta, fornecer informações suficientes e usar avaliações e denúncias de forma responsável. Cada usuário responde pelas informações e decisões que adota, observadas as responsabilidades que a legislação possa atribuir a cada participante.",
        },
        {
          title: "5. Responsabilidades das empresas",
          content:
            "A empresa deve informar coleta, destino, conteúdo permitido, observações, valor e forma de pagamento com clareza; disponibilizar o pedido; oferecer condições adequadas de acesso; não solicitar transporte ilegal ou incompatível; e acertar diretamente com o motoboy o pagamento combinado.",
        },
        {
          title: "6. Responsabilidades dos motoboys",
          content:
            "O motoboy declara que é responsável por possuir e manter válidos documentos, habilitações, registros, equipamentos, licenças, autorizações e demais requisitos legalmente exigidos para exercer sua atividade. Deve avaliar cada oportunidade e executar apenas atividades que possa realizar legalmente. A Vapor Entregas não solicita nem verifica CNH ou documentos do veículo neste MVP, e o cadastro não comprova regularidade profissional.",
        },
        {
          title: "7. Publicação e aceitação de oportunidades",
          content:
            "A publicação é uma oportunidade, não garantia de aceite. O motoboy pode consultar as informações e aceitar voluntariamente. Depois do aceite, as partes devem respeitar o fluxo operacional e registrar cancelamentos quando permitidos. A plataforma não garante quantidade, frequência, disponibilidade ou conclusão de entregas.",
        },
        {
          title: "8. Autonomia do motoboy",
          content:
            "O motoboy escolhe quando ficar online ou offline, sem jornada mínima, exclusividade, escala, salário ou garantia de oportunidades. Pode ignorar ou recusar oportunidades sem punição pela simples recusa. O cadastro, isoladamente, não cria relação de emprego. Essa descrição do modelo pretendido não substitui a análise das circunstâncias concretas nem elimina responsabilidades previstas em lei.",
        },
        {
          title: "9. Pagamento direto no MVP",
          content:
            "A Vapor Entregas NÃO processa o pagamento da entrega no MVP. Empresa e motoboy combinam diretamente valor, forma, momento do pagamento e eventual ajuste permitido. O valor registrado serve para apresentação e histórico e não significa que a Vapor Entregas recebeu, custodiou ou repassou dinheiro. Não há saldo, carteira, split ou repasse financeiro.",
        },
        {
          title: "10. Avaliações e favoritos",
          content:
            "Depois de uma entrega concluída, participantes podem avaliar a contraparte. A nota deve refletir a experiência real e não pode conter ameaça, discriminação, fraude ou informação falsa. Comentários não são públicos neste MVP. Favoritos são organização privada da empresa e não garantem prioridade automática.",
        },
        {
          title: "11. Denúncias, disputas e moderação",
          content:
            "Participantes podem denunciar problemas vinculados à operação. A equipe administrativa pode analisar o relato, preservar registros e alterar seu status. Denúncia, nota baixa ou cancelamento não gera punição automática; decisões de moderação dependem de análise humana e contexto.",
        },
        {
          title: "12. Suspensão e banimento",
          content:
            "Contas podem ser suspensas ou banidas após análise de uso indevido, risco, fraude, violação destes Termos ou obrigação legal. A medida bloqueia funções operacionais e não apaga automaticamente históricos necessários. Quando cabível, o usuário pode pedir esclarecimento pelo canal de contato.",
        },
        {
          title: "13. Usos proibidos",
          content:
            "É proibido usar conta de terceiro, fraudar localização ou identidade, publicar pedido ilegal, ameaçar ou discriminar pessoas, explorar falhas, acessar dados sem autorização, gerar spam, manipular avaliações ou usar a plataforma para atividade incompatível com a legislação.",
        },
        {
          title: "14. Segurança",
          content:
            "O usuário deve proteger senha e dispositivo e comunicar suspeitas. A Vapor Entregas aplica medidas técnicas compatíveis com o MVP, mas nenhum sistema é totalmente imune a indisponibilidade, fraude ou incidente. Responsabilidades serão avaliadas conforme a lei e as circunstâncias do caso.",
        },
        {
          title: "15. Propriedade intelectual",
          content:
            "A marca provisória, interface, textos, código e elementos próprios da plataforma são protegidos nos limites aplicáveis. O usuário mantém direitos sobre conteúdo que fornece e autoriza o processamento necessário às funcionalidades solicitadas.",
        },
        {
          title: "16. Disponibilidade da plataforma",
          content:
            "A plataforma pode ficar temporariamente indisponível por manutenção, falha de internet, mapas, banco de dados ou outros fatores. Funcionalidades podem evoluir, ser corrigidas ou descontinuadas, com comunicação adequada quando a mudança afetar materialmente os usuários.",
        },
        {
          title: "17. Encerramento da conta",
          content:
            "O usuário pode pedir encerramento após concluir ou cancelar operações pendentes. Identificadores são anonimizados quando possível. Entregas, avaliações, denúncias, disputas, aceites e auditorias podem ser preservados seletivamente quando necessários para segurança, exercício de direitos, obrigações aplicáveis ou resolução de conflitos, sem prazo jurídico fixo inventado nestes Termos.",
        },
        {
          title: "18. Privacidade e legislação aplicável",
          content:
            "O tratamento de dados segue a Política de Privacidade e a legislação brasileira aplicável. Divergências deverão buscar solução adequada pelos canais disponíveis e, quando necessário, pelas autoridades ou foro competente definido segundo a legislação.",
        },
        {
          title: "19. Versões futuras e contato",
          content: `Estes Termos podem receber novas versões. Mudanças relevantes poderão exigir novo aceite registrado por versão. Canal informado para contato: ${contact}. Esse dado e a identificação do responsável precisam estar configurados antes do lançamento comercial.`,
        },
      ]}
    />
  );
}
