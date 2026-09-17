# Vapor Control Center

## Escopo

O Control Center reutiliza o RBAC `ADMIN`, as rotas administrativas e o `AdminAction` existentes. Todas as mutações validam sessão e função no servidor, verificam a origem da requisição, usam schemas com allowlist e registram auditoria.

## Acesso manual de motoboy

`ManualAccessGrant` registra plano, início, vencimento, motivo, origem administrativa e eventual revogação. Uma concessão ativa usa uma chave única por usuário, evitando duas concessões manuais abertas. O acesso operacional aceita um pagamento/trial válido **ou** uma concessão manual vigente.

Uma concessão manual:

- não cria `Subscription`;
- não cria `SubscriptionPayment`;
- não inventa ID do Mercado Pago;
- não entra na receita confirmada;
- não cancela, reembolsa nem altera contrato Mercado Pago existente;
- permanece no histórico depois de revogada.

Na ficha do motoboy, o admin pode conceder, estender ou revogar. O motivo é obrigatório e cada ação gera `MOTOBOY_PLAN_GRANTED`, `MOTOBOY_PLAN_EXTENDED` ou `MOTOBOY_PLAN_REVOKED`.

## Gestão Pro

O admin pode liberar, estender ou remover Pro, com vencimento ou sem vencimento. `proExpiresAt` e `proAccessSource` distinguem a vigência e a origem. Remover acesso não apaga entregas, relatórios ou histórico.

## Receita

O dashboard soma somente `SubscriptionPayment` aprovado. VaporPay continua representando declarações entre empresa e motoboy; não é receita da Vapor e não representa custódia.

## Segurança e rollback

Não existem ações para visualizar segredos, executar SQL, resetar banco ou apagar histórico. Para rollback da aplicação, reverta o commit. A migration é aditiva; mantenha as tabelas/colunas enquanto houver histórico. Nunca execute `migrate reset` em produção.
