import { LegalPage } from "@/components/legal/legal-page";
import { CURRENT_PRIVACY_VERSION } from "@/config/product";
import { getLegalEnv } from "@/server/config/env";

export default function PrivacyPage() {
  const { operatorName, contactEmail } = getLegalEnv();
  const operator =
    operatorName ??
    "CONTROLADOR/RESPONSÁVEL PENDENTE DE DEFINIÇÃO ANTES DA PRODUÇÃO";
  const contact =
    contactEmail ??
    "CANAL DE PRIVACIDADE PENDENTE DE CONFIGURAÇÃO ANTES DA PRODUÇÃO";
  return (
    <LegalPage
      title="Política de Privacidade"
      version={CURRENT_PRIVACY_VERSION}
      intro="Esta Política descreve os tratamentos que o MVP efetivamente realiza. Ela aplica necessidade e minimização e deve passar por revisão jurídica e de privacidade profissional antes do lançamento comercial."
      sections={[
        {
          title: "1. Responsável e alcance",
          content: `Esta Política se aplica à Vapor Entregas, suas páginas, cadastros e áreas autenticadas. Identificação informada para produção: ${operator}. Nenhuma razão social, CNPJ, endereço ou telefone inexistente é presumido.`,
        },
        {
          title: "2. Pré-cadastro do lançamento",
          content:
            "Na página de pré-lançamento são solicitados somente nome, WhatsApp e indicação de interesse como motoboy ou empresa. Esses dados são usados para contato sobre o pré-lançamento e lançamento, conforme o aviso exibido no envio. O servidor registra a versão e o horário desse aviso, evita cadastros repetidos e não cria conta, senha ou perfil operacional.",
        },
        {
          title: "3. Dados cadastrais coletados",
          content:
            "Para motoboys: nome, CPF, RG, telefone, e-mail, data de nascimento, cidade, senha protegida por hash e aceites. Para empresas: nome do responsável, nome fantasia, CPF ou CNPJ, telefone, e-mail, cidade, endereço, número, bairro, complemento e referência quando informados. O MVP não coleta CNH, foto, selfie ou upload de documentos.",
        },
        {
          title: "4. Dados de localização",
          content:
            "A empresa pode confirmar o ponto de coleta no mapa, gerando latitude e longitude. O motoboy só fornece localização depois de escolher ficar online e conceder permissão. Enquanto online, a última localização e seu horário podem ser atualizados moderadamente para disponibilidade e oportunidades próximas. Ao ficar offline, sair ou desmontar a área autenticada, o navegador interrompe a observação. Não existe histórico GPS permanente; a presença expira pelo TTL configurado.",
        },
        {
          title: "5. Dados operacionais e de reputação",
          content:
            "São tratados dados de entregas, coleta e destino, valor e pagamento informados, status e horários, avaliações, favoritos, denúncias e moderação. Também existem registros mínimos de sessão, tentativas de autenticação, aceites jurídicos e auditoria administrativa necessários à segurança e ao funcionamento.",
        },
        {
          title: "6. Finalidades",
          content:
            "Os dados são usados para criar e autenticar contas, aplicar permissões, publicar e executar entregas, calcular distância aproximada, indicar oportunidades, manter presença recente, gerar histórico, avaliações e denúncias, atender solicitações do titular, prevenir abuso e permitir moderação e auditoria.",
        },
        {
          title: "7. Compartilhamento e visibilidade",
          content:
            "Cada participante vê somente dados necessários à entrega e reputação. CPF, RG, CPF/CNPJ, senha, telefone, e-mail e coordenadas internas não são públicos nem compartilhados sem necessidade. Administradores autenticados acessam informações limitadas para operação e moderação. Links para mapas são gerados quando necessários. Não há venda de dados nem serviço pago externo obrigatório no MVP.",
        },
        {
          title: "8. Cookies e sessões",
          content:
            "A autenticação usa cookie de sessão protegido. No servidor é guardado apenas o hash do token, com validade e possibilidade de revogação. Troca de senha, suspensão, banimento, encerramento e logout podem revogar sessões. Token e hash não são incluídos em exportações nem exibidos.",
        },
        {
          title: "9. Segurança e dados protegidos",
          content:
            "Senhas usam Argon2id e nunca são armazenadas em texto puro. CPF, RG e CPF/CNPJ usam criptografia autenticada e fingerprint para busca exata autorizada. Há validação, rate limit, controle de role, ownership, proteção de origem e minimização de respostas. Nenhuma medida garante risco zero; incidentes e responsabilidades dependem do contexto e da legislação.",
        },
        {
          title: "10. Retenção",
          content:
            "Os dados são mantidos enquanto a conta e as funcionalidades exigirem. Após encerramento, identificadores são anonimizados quando possível. Entregas, avaliações, denúncias, disputas, aceites e auditorias podem permanecer seletivamente quando necessários para segurança, exercício de direitos, prevenção a fraude, resolução de conflitos ou obrigação aplicável. Não é fixado prazo jurídico sem base definida; a necessidade deve ser revisada por categoria.",
        },
        {
          title: "11. Acesso, correção e exportação",
          content:
            "Nas configurações, o usuário visualiza dados básicos, corrige nome, telefone e nome fantasia quando aplicável, altera a senha e gera exportação JSON após confirmar a senha atual. A exportação contém dados próprios adequados e não contém hash de senha, sessão, token, segredo ou dado de terceiro sem necessidade.",
        },
        {
          title: "12. Encerramento e exclusão",
          content:
            "O usuário pode solicitar encerramento com senha e confirmação forte. Entregas operacionais pendentes impedem o processamento. O encerramento bloqueia acesso, revoga sessões, interrompe presença e anonimiza dados cadastrais e localização quando possível, sem destruir registros necessários para disputas, denúncias, segurança e auditoria.",
        },
        {
          title: "13. Direitos do titular",
          content:
            "Conforme a legislação aplicável, o titular pode pedir confirmação e acesso, correção, informação sobre uso e compartilhamento, portabilidade quando cabível, revisão de decisões relevantes, oposição ou eliminação quando aplicável. Solicitações podem exigir confirmação de identidade e considerar retenções justificáveis.",
        },
        {
          title: "14. Contato e atualizações",
          content: `Canal de privacidade informado: ${contact}. Esse canal e a identificação do responsável devem ser preenchidos antes da produção. Novas versões relevantes podem exigir novo aceite; cada aceite é registrado com tipo, versão e horário, sem metadados excessivos.`,
        },
      ]}
    />
  );
}
