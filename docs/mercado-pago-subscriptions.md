# Assinaturas Mercado Pago

## Escopo e arquitetura

O Mercado Pago é usado exclusivamente para cobrar a mensalidade de acesso da
Vapor Entregas. Pagamentos de corridas, split, PIX entre usuários, carteira,
saldo, repasse e escrow não fazem parte desta integração.

O MySQL continua sendo a fonte interna dos planos e das permissões. O Mercado
Pago é a fonte de verdade do estado externo da assinatura e das cobranças:

1. a role autenticada determina o `SubscriptionPlan` interno;
2. o backend consulta ou cria o plano em `POST /preapproval_plan`;
3. o navegador usa MercadoPago.js/CardForm para tokenizar o cartão;
4. o backend cria a assinatura associada e autorizada em `POST /preapproval`;
5. webhook e sincronização consultam a API antes de alterar o banco;
6. somente `TRIAL` ou `ACTIVE` liberam novas operações.

O Access Token privado nunca é enviado ao navegador. O backend recebe apenas o
`cardTokenId` efêmero, usa-o uma vez e não o persiste. Número do cartão, CVV e
documento são capturados pelo SDK oficial e não são enviados à API da Vapor.

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
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=SUA_PUBLIC_KEY_DE_TESTE
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_DE_TESTE
MERCADO_PAGO_WEBHOOK_SECRET=SUA_ASSINATURA_SECRETA_DE_TESTE
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
```

`MERCADO_PAGO_MODE` aceita `test` ou `production`. A Public Key é a única
credencial Mercado Pago exposta ao frontend; Access Token e segredo de webhook
são exclusivamente server-side. Public Key e Access Token devem vir da mesma
aplicação e do mesmo ambiente. Em produção, `NEXT_PUBLIC_APP_URL` deve
ser HTTPS público; o código rejeita localhost/loopback. Não copie `.env.example`
sobre um `.env` existente. O `.env` está ignorado pelo Git. Um ID de plano só é
reutilizado quando `externalPlanMode` coincide com o ambiente atual.

Como variáveis `NEXT_PUBLIC_*` são incorporadas ao bundle do navegador durante
o build do Next.js, configure a Public Key na Hostinger antes de executar o
build/redeploy. Alterar apenas o valor no processo já compilado não atualiza o
frontend.

Em cada tentativa de autorização, o servidor registra um diagnóstico seguro no
scope `api.subscriptions.credential-diagnostic`. Ele contém somente modo,
presença das configurações, prefixos, presença dos identificadores de
aplicação, resultado da comparação entre credenciais, conta vendedora resolvida,
`site_id`, tipo de usuário vendedor e compatibilidade entre vendedor e
`collector_id` do plano. Também inclui a presença do token/plano e o booleano
`publicKeyBuildMatchesRuntime`. Nenhuma chave, token, e-mail ou ID completo é
registrado. `false` nesse último campo indica que o bundle foi compilado com
outra Public Key; `null` indica que a comparação não pôde ser feita.

Erros HTTP do provedor também preservam somente a presença de um request ID
oficial (`providerRequestId`), quando esse header for devolvido pelo Mercado
Pago. Esse identificador ajuda o suporte do provedor sem revelar Authorization
ou o corpo sensível da requisição.

O CardForm também intercepta `onError`, `onPaymentMethodsReceived`,
`onIssuersReceived`, `onCardTokenReceived`, `onFetching` e `onSubmit`. Os logs
do navegador contêm apenas código/status/mensagem sanitizada do SDK e os
booleanos `paymentMethodResolved`, `issuerResolved` e `tokenGenerated`; BIN,
documento, e-mail, dados do cartão e token nunca são registrados. Antes do
`POST /preapproval`, o servidor registra somente a presença estrutural dos
campos, o status `authorized` e se `auto_recurring` está presente.

## Sincronização dos planos

`POST /api/admin/subscription-plans/sync` exige ADMIN autenticado, origem válida e
rate limit. O mesmo processo é executado para o plano da role antes de iniciar
uma nova assinatura.

- Com ID salvo no mesmo ambiente: executa `GET /preapproval_plan/{id}`.
- O GET também confirma a presença de `application_id`/`collector_id` e, quando
  o formato da credencial permite a comparação, rejeita plano de outra
  aplicação sem registrar esses identificadores.
- Plano compatível: reutiliza.
- Somente nome/back URL divergentes: atualiza por
  `PUT /preapproval_plan/{id}`.
- Valor/frequência/moeda divergentes, ID ausente, 404, resposta 400
  `Resource not found`, plano de outra aplicação ou troca de ambiente: cria
  novo plano com chave de idempotência, faz um GET de confirmação e salva o ID
  real retornado pelo Mercado Pago.

Criar outro plano quando o valor muda preserva assinaturas existentes no plano
anterior. Cada `Subscription` guarda o `providerPlanId` contratado. A configuração
remota usa frequência `1`, tipo `months`, moeda `BRL`, preço/trial do banco e
`back_url` igual à URL pública raiz da aplicação.

O diagnóstico manual padrão é somente leitura:

```bash
npm run mp:check-plans
```

Para verificar o encadeamento completo entre credenciais, vendedor e planos,
execute também o diagnóstico determinístico, que é somente leitura:

```bash
npm run mp:doctor
```

O comando consulta `GET /users/me` com o Access Token do runtime, confirma
`site_id`, tipo da conta, presença dos identificadores de aplicação e compara
o vendedor resolvido com o `collector_id` de cada plano. Também compara a
configuração remota com preço, frequência, trial e URL salvos pela Vapor. Ele
não cria assinatura, não cobra, não altera o banco e não imprime credenciais,
e-mail, IDs completos ou token de cartão. Resultado `ok: false` traz códigos
seguros em `issues`; corrija esses códigos antes de testar outro cartão.

O prefixo `APP_USR` não é usado isoladamente para decidir se uma credencial é
de teste ou produção: contas vendedoras de teste também podem receber
credenciais com esse prefixo. A decisão considera a conta retornada pela API,
o modo configurado e os recursos pertencentes a ela.

Ele lê `subscription_plans.externalPlanId`, consulta cada plano com o mesmo
Access Token do runtime e informa `OK`, `INCOMPATÍVEL` ou `NÃO ENCONTRADO`
para Motoboy e Empresa. Também consulta
`GET /preapproval_plan/search` para confirmar que os IDs aparecem na listagem.
IDs são mascarados e credenciais não são impressas. Para reparar explicitamente
planos ausentes/incompatíveis em um
ambiente já conferido, execute `npm run mp:check-plans -- --repair`; essa forma
cria/atualiza recursos no Mercado Pago e persiste o ID real no MySQL, portanto
não deve ser usada com credenciais de produção sem autorização.

## Endpoints locais

- `GET /api/subscriptions/plans`: planos públicos ativos.
- `GET /api/subscriptions/me`: plano da role e assinatura/pagamentos do usuário.
- `POST /api/subscriptions/checkout`: cria/reutiliza assinatura para a role. O
  body aceito é `{ "cardTokenId": "..." }`; preço, plano e e-mail enviados pelo
  cliente são rejeitados.
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

O CardForm oficial roda no navegador com a Public Key e monta campos seguros em
iframes do Mercado Pago. Ao confirmar, o SDK gera um token de uso único. A Vapor
envia somente esse token para sua API; não envia preço, plano, e-mail, documento,
número do cartão ou CVV.

O token é lido apenas dentro do callback de envio e encaminhado imediatamente à
API. Depois de qualquer tentativa rejeitada, o CardForm é desmontado e recriado,
obrigando a geração de outro token antes do próximo envio.

O backend usa role e ID da sessão, recarrega o e-mail do banco, escolhe preço e
plano internos, cria `external_reference` como `subscription:<uuid>` sem PII e
envia `preapproval_plan_id`, `card_token_id` e `status=authorized`. A
`notification_url` aponta para o webhook HTTPS com `source_news=webhooks`.
Somente a resposta validada da API é persistida; o token não entra em models,
eventos ou logs.

Quando `trialDays` é 7, o plano remoto recebe `free_trial` de 7 dias. A primeira
assinatura fica `TRIAL` localmente durante esse período. Usuários com qualquer
histórico anterior usam um plano remoto idempotente sem trial, impedindo uma
segunda concessão sem exigir alteração de schema.

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
3. Configure `MERCADO_PAGO_MODE=test`, Public Key e Access Token de teste da
   mesma aplicação, além de uma URL HTTPS pública de homologação.
   Para webhook local, use túnel HTTPS e ajuste `NEXT_PUBLIC_APP_URL`.
4. Aplique migrations e crie empresa/motoboy de teste. Com prelaunch ativo,
   inclua somente seus UUIDs em `PRELAUNCH_TEST_USER_IDS`.
5. Como ADMIN em `/admin/assinaturas`, sincronize os planos e confira no painel.
6. Como usuário de teste, abra **Minha assinatura**, clique **Assinar plano** e
   use o comprador/cartão de teste exibido na documentação atual do Mercado
   Pago. Os dados devem pertencer ao mesmo país/ambiente do vendedor de teste.
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
`MERCADO_PAGO_MODE=production`, Public Key e Access Token produtivos da mesma
aplicação, segredo produtivo e a API oficial.

Cadastre/valide
`https://DOMINIO_REAL/api/webhooks/mercadopago?source_news=webhooks` e os tópicos
de assinatura/pagamento. Não promova IDs ou segredos Sandbox. Não faça cobrança
real sem autorização explícita.

## Troubleshooting

- **503:** Access Token ausente no ambiente.
- **502 ao autorizar cartão:** consulte o log pelo `correlationId`; erros 400/422
  recebem mensagem pública segura, enquanto detalhes sanitizados ficam apenas no
  servidor.
- **404 `Card token service not found`:** confira o log
  `api.subscriptions.credential-diagnostic`. Em modo `test`, Public Key e Access
  Token precisam estar configurados e `publicKeyBuildMatchesRuntime` deve ser
  `true`. Execute `npm run mp:doctor` para validar conta, site, aplicação,
  vendedor e planos. Não conclua o ambiente apenas pelo prefixo `APP_USR`.
- **400 `guest_site_mismatch`:** execute `npm run mp:doctor`. Se vendedor,
  `site_id=MLB`, aplicação e `collector_id` estiverem corretos, a divergência
  restante está na identidade do comprador/token efêmero. Use o e-mail real
  fornecido pela conta compradora de teste brasileira, e não o username, nome
  de exibição ou e-mail pessoal do operador.
- **400 `Resource not found` em `/preapproval`:** execute
  `npm run mp:check-plans`. O ID vem de
  `subscription_plans.externalPlanId`, nunca do UUID/slug/preço. O fluxo
  considera 404 e o 400 específico como plano ausente, cria um plano idempotente
  com as credenciais atuais, confirma por GET e substitui somente o ID externo
  persistido.
- **502 geral:** timeout, HTTP ou resposta inválida; não cancele localmente.
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
