# Assinaturas Mercado Pago

## Escopo e arquitetura

O Mercado Pago é usado exclusivamente para cobrar a mensalidade de acesso da
Vapor Entregas. Pagamentos de corridas, split, PIX entre usuários, carteira,
saldo, repasse e escrow não fazem parte desta integração.

O MySQL continua sendo a fonte interna dos planos e das permissões. O Mercado
Pago é a fonte de verdade do estado externo da assinatura e das cobranças:

1. a role autenticada determina o `SubscriptionPlan` interno;
2. o backend consulta ou cria o plano em `POST /preapproval_plan`;
3. o backend cria a assinatura associada em `POST /preapproval`;
4. o usuário conclui a autorização no domínio do Mercado Pago;
5. webhook e sincronização consultam a API antes de alterar o banco;
6. somente `TRIAL` ou `ACTIVE` liberam novas operações.

O token privado nunca é enviado ao navegador. O backend não recebe nem persiste
número de cartão, CVV ou documento do pagador.

Referências oficiais: [API de Assinaturas](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/overview),
[assinatura com plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan)
e [Webhooks de Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).

## Models e migration

- `SubscriptionPlan`: role, nome, descrição, preço, disponibilidade, teste,
  `externalPlanId` e ambiente que originou o ID (`externalPlanMode`).
- `Subscription`: snapshot do preço, `externalReference`, IDs do plano e da
  assinatura no provedor, status, checkout e datas.
- `SubscriptionPayment`: fatura/pagamento, valor, moeda, status e datas. IDs de
  fatura e pagamento são únicos; dados de cartão não são armazenados.
- `SubscriptionEvent`: registro idempotente de webhooks e auditoria. O
  `providerEventId` é único.

A migration incremental é
`prisma/mysql/migrations/20260830190000_mercado_pago_recurring_billing/migration.sql`.
Ela não altera o PostgreSQL arquivado, não apaga dados e mantém o preço das
assinaturas já criadas. Os planos para novas adesões ficam em R$ 19,90
(`MOTOBOY`) e R$ 29,90 (`COMPANY`).

## Variáveis

```dotenv
NEXT_PUBLIC_APP_URL=https://app.seudominio.com.br
MERCADO_PAGO_MODE=test
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_DE_TESTE
MERCADO_PAGO_WEBHOOK_SECRET=SUA_ASSINATURA_SECRETA_DE_TESTE
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
```

`MERCADO_PAGO_MODE` aceita `test` ou `production`. Access Token e segredo de
webhook são exclusivamente server-side. Em produção, `NEXT_PUBLIC_APP_URL` deve
ser HTTPS público; o código rejeita localhost/loopback. Não copie `.env.example`
sobre um `.env` existente. O `.env` está ignorado pelo Git. Um ID de plano só é
reutilizado quando `externalPlanMode` coincide com o ambiente atual.

## Sincronização dos planos

`POST /api/admin/subscription-plans/sync` exige ADMIN autenticado, origem válida e
rate limit. O mesmo processo é executado para o plano da role antes de iniciar
uma nova assinatura.

- Com ID salvo no mesmo ambiente: executa `GET /preapproval_plan/{id}`.
- Plano compatível: reutiliza.
- Somente nome/back URL divergentes: atualiza por
  `PUT /preapproval_plan/{id}`.
- Valor/frequência/moeda divergentes, ID ausente, 404 ou troca de ambiente: cria
  novo plano com chave de idempotência e salva o ID.

Criar outro plano quando o valor muda preserva assinaturas existentes no plano
anterior. Cada `Subscription` guarda o `providerPlanId` contratado. A configuração
remota usa frequência `1`, tipo `months`, moeda `BRL`, preço do banco e
`back_url` da área autenticada.

## Endpoints locais

- `GET /api/subscriptions/plans`: planos públicos ativos.
- `GET /api/subscriptions/me`: plano da role e assinatura/pagamentos do usuário.
- `POST /api/subscriptions/checkout`: cria/reutiliza assinatura para a role. O
  body aceito é `{}`; preço, plano e e-mail do cliente são rejeitados.
- `POST /api/subscriptions/sync`: consulta `GET /preapproval/{id}`.
- `POST /api/subscriptions/cancel`: exige `{ "confirm": true }`, ownership e
  confirmação de `PUT /preapproval/{id}` com `status=canceled`.
- `POST /api/subscriptions/reactivate`: apenas para assinatura `paused`.
- `POST /api/webhooks/mercadopago`: webhook público e assinado.
- `POST /api/admin/subscription-plans/sync`: sincronização administrativa.

As páginas de retorno são `/app/motoboy/assinatura/retorno` e
`/app/empresa/assinatura/retorno`. A visita não ativa nada: ela chama a
sincronização, que consulta o Mercado Pago.

## Criação da assinatura

O backend usa role e ID da sessão, recarrega o e-mail do banco, escolhe preço e
plano internos, cria `external_reference` como `subscription:<uuid>` sem PII e
envia `preapproval_plan_id`. A `notification_url` aponta para o webhook HTTPS com
`source_news=webhooks`; o estado inicial é `pending`. O `init_point` só é aceito
se pertencer a domínio HTTPS do Mercado Pago.

A documentação oficial atual apresenta uma inconsistência: o guia de plano
associado descreve criação direta com `card_token_id` e `authorized`, enquanto a
referência de `POST /preapproval` também documenta `init_point` e resposta
`pending`. Esta implementação segue o fluxo hospedado solicitado, com plano
associado e `pending`. Valide obrigatoriamente esse contrato na conta Sandbox
brasileira antes da produção. Se a conta rejeitar a combinação, não remova o
plano nem colete cartão no backend: será necessário decidir entre tokenização
oficial MP.js + preapproval `authorized` ou o fluxo oficial sem plano associado.

## Status e acesso

| Mercado Pago/cobrança             | Interno    | Acesso operacional |
| --------------------------------- | ---------- | ------------------ |
| `authorized` / pagamento aprovado | `ACTIVE`   | sim                |
| aguardando autorização            | `PENDING`  | não                |
| pagamento recorrente recusado     | `PAST_DUE` | não                |
| `paused`                          | `PAUSED`   | não                |
| `canceled`                        | `CANCELED` | não                |
| `expired`                         | `EXPIRED`  | não                |
| teste local válido                | `TRIAL`    | sim                |

Tentativa recusada não cancela a assinatura. Ela pode voltar a `ACTIVE` após nova
cobrança aprovada. Timeout, 4xx, 5xx ou resposta inválida retorna erro temporário
e não muda a assinatura para cancelada.

O gate é aplicado ao início de operações: publicar, aceitar e ficar online.
Perfil, configurações, histórico, legal, suporte e assinatura permanecem
acessíveis. Avançar entrega já aceita não consulta assinatura; uma corrida não é
interrompida no meio.

## Webhook e idempotência

Tópicos suportados: `subscription_preapproval`,
`subscription_authorized_payment` e `payment`.

O endpoint:

1. valida HMAC SHA-256 de `x-signature` com `x-request-id`, `data.id` e segredo;
2. valida coincidência entre query `data.id` e body;
3. rejeita `live_mode` incompatível com `MERCADO_PAGO_MODE`;
4. consulta `/preapproval/{id}`, `/authorized_payments/{id}` e/ou
   `/v1/payments/{id}`;
5. valida external reference, plano contratado, BRL e preço do snapshot;
6. em uma transação MySQL, cria evento único, atualiza assinatura e faz
   create/update do pagamento;
7. em duplicidade, a unique key aborta todos os efeitos repetidos.

O webhook é a única API de assinatura liberada publicamente no prelaunch. Isso
não enfraquece o gate porque chamadas sem HMAC válido recebem 401. As demais
rotas continuam exigindo ADMIN/UUID autorizado quando `PRELAUNCH_MODE=true`.

## Renovação e cancelamento

Não existe cron de cobrança. O Mercado Pago agenda a cobrança, tenta novamente
conforme suas regras e notifica a aplicação. Cada cobrança confirmada é
registrada uma vez em `SubscriptionPayment`.

No cancelamento, o backend carrega a assinatura do próprio usuário, envia
`PUT /preapproval/{id}`, exige confirmação do ID/status e persiste estado +
auditoria atomicamente. O body não permite indicar outra assinatura.

## Sandbox

1. Crie/abra a aplicação em **Mercado Pago Developers > Suas integrações**.
2. Obtenha credenciais de teste e contas de teste no painel. Não use dinheiro ou
   credenciais reais.
3. Configure `MERCADO_PAGO_MODE=test` e uma URL HTTPS pública de homologação.
   Para webhook local, use túnel HTTPS e ajuste `NEXT_PUBLIC_APP_URL`.
4. Aplique migrations e crie empresa/motoboy de teste. Com prelaunch ativo,
   inclua somente seus UUIDs em `PRELAUNCH_TEST_USER_IDS`.
5. Como ADMIN em `/admin/assinaturas`, sincronize os planos e confira no painel.
6. Como usuário, abra **Minha assinatura**, clique **Assinar plano** e use o
   comprador/cartão de teste exibido na documentação atual do Mercado Pago.
7. Para aprovação, confirme `ACTIVE`, um pagamento no histórico e acesso a nova
   operação.
8. Para recusa, use o cenário de teste atual; confirme `PAST_DUE`, um histórico
   único e acesso somente não operacional.
9. Reenvie a mesma notificação e confirme que evento/pagamento não duplicam.
10. Cancele pela aplicação e confirme `canceled` remoto e `CANCELED` local.

Não copie cartões de teste para o repositório; consulte a lista atual do Mercado
Pago. O webhook Sandbox usa o segredo de teste, não o produtivo.

## Produção/Hostinger

Configure variáveis protegidas no painel Node.js, aplique
`prisma migrate deploy`, reinicie e confirme que o proxy preserva body, query,
`x-signature` e `x-request-id`. Use `NODE_ENV=production`, URL HTTPS real,
`MERCADO_PAGO_MODE=production`, credenciais produtivas e a API oficial.

Cadastre/valide
`https://DOMINIO_REAL/api/webhooks/mercadopago?source_news=webhooks` e os tópicos
de assinatura/pagamento. Não promova IDs ou segredos Sandbox. Não faça cobrança
real sem autorização explícita.

## Troubleshooting

- **503:** Access Token ausente no ambiente.
- **502:** timeout, HTTP ou resposta inválida; não cancele localmente.
- **401 webhook:** confira segredo, `data.id`, headers e URL configurada.
- **409 ambiente:** `live_mode` não coincide com o modo.
- **409 correlação/plano/valor:** compare conta, credencial, ambiente e recurso;
  não force atualização manual.
- **Webhook sem pagamento:** confira tópicos
  `subscription_authorized_payment` e `payment` no painel.

## Critério de validação

Testes mockados validam lógica local, segurança e contratos esperados. Não provam
compatibilidade da conta Mercado Pago. Só marque **Sandbox validado** após
aprovação, recusa, repetição de webhook, renovação observável e cancelamento com
credenciais de teste. Produção permanece não validada até teste separado e
autorização explícita; este procedimento não autoriza cobrança real.
