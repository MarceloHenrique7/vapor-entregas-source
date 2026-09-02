# Mercado Pago Payment Brick e acesso de 30 dias

## Arquitetura

O fluxo principal usa o Payment Brick oficial no navegador e pagamentos avulsos
no endpoint `POST /v1/payments` do Mercado Pago. O navegador recebe somente a
Public Key. Access Token e segredo do webhook permanecem no servidor.

1. `GET /api/subscriptions/me` retorna o plano permitido para o papel autenticado.
2. O Payment Brick oferece explicitamente Pix e cartão de crédito.
3. `POST /api/subscriptions/checkout` ignora preço e plano enviados pelo
   navegador e busca novamente esses dados no MySQL. Em produção, também usa o
   e-mail autenticado; no Sandbox, usa o e-mail informado no Brick conforme a
   regra de testes do Mercado Pago.
4. O backend cria uma tentativa em `subscription_payments`, envia uma UUID em
   `X-Idempotency-Key` e cria o pagamento em `/v1/payments`.
5. O backend consulta `/v1/payments/{id}`. Somente `approved`, com valor, moeda,
   usuário, plano, role, metadata e `external_reference` corretos, libera acesso.
6. O webhook autenticado repete a consulta e sincroniza alterações futuras.

As rotas e campos de `preapproval` permanecem temporariamente apenas para
histórico e cancelamento de contratos recorrentes antigos. O checkout novo não
chama `/preapproval` nem `/preapproval_plan`.

## Models reaproveitados

- `SubscriptionPlan`: fonte interna do papel, preço e disponibilidade.
- `Subscription`: representa o direito de acesso e guarda início/fim do período.
- `SubscriptionPayment`: representa cada tentativa financeira. Guarda status
  interno, ID do provider, idempotência, valor, moeda, método, datas e metadata
  não sensível.
- `SubscriptionEvent`: ledger idempotente de notificações e confirmações.

Campos legados (`externalPlanId`, `providerPlanId` e
`providerSubscriptionId`) não são apagados. Eles permitem administrar contratos
antigos durante a transição.

## Período e trial

Uma conta nova elegível recebe uma única concessão local de sete dias dentro da
mesma criação transacional do usuário. `trialGrantedAt` e `trialEndsAt` impedem
que cancelamento ou nova tentativa reiniciem o benefício.

Cada pagamento aprovado adiciona exatamente `30 * 24 horas`:

- acesso vencido: aprovação + 30 dias;
- acesso ainda válido: vencimento atual + 30 dias.

`accessGrantedAt` impede o mesmo pagamento de conceder tempo duas vezes. O gate
operacional exige `TRIAL` ou `ACTIVE` e `currentPeriodEnd > agora`; portanto não
depende de cron. Histórico, perfil e operações já em andamento continuam fora
desse bloqueio.

## Pix

O pagamento nasce como `PENDING`; QR Code e copia-e-cola são exibidos a partir da
resposta do provider. O frontend faz polling controlado em
`POST /api/subscriptions/payments/status`, que exige autenticação e ownership.
Gerar o Pix não libera acesso. A liberação depende da reconsulta server-side
retornar `approved`.

## Cartão

Número completo e CVV ficam nos campos seguros do Mercado Pago. O Brick fornece
um token temporário ao callback e ele é encaminhado para `/v1/payments`. A Vapor
não persiste nem registra esse token. Em produção, o backend usa o e-mail da
conta autenticada. Com credenciais TEST, o e-mail informado no Brick é usado
somente na requisição ao provider, não é persistido e não pode terminar em
`@testuser.com`; ele também deve ser diferente do e-mail da conta vendedora.

## Webhook

Cadastre exatamente:

```text
https://vaporentregaspnz.com/api/webhooks/mercadopago?source_news=webhooks
```

Habilite notificações de **Pagamentos** (`payment`). A rota valida `x-signature`
e `x-request-id`, compara `data.id` do corpo e da query, confere TEST/produção,
consulta `/v1/payments/{id}` e executa a concessão em transação MySQL. Eventos
repetidos e pagamentos já concedidos não somam novos 30 dias.

Não habilite tópicos de assinatura recorrente para novos contratos. Eles só são
entendidos enquanto houver contratos legados.

## Variáveis de ambiente

```dotenv
MERCADO_PAGO_MODE=test
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=SUBSTITUA_PELA_PUBLIC_KEY_DE_TESTE
MERCADO_PAGO_ACCESS_TOKEN=SUBSTITUA_PELO_ACCESS_TOKEN_DE_TESTE
MERCADO_PAGO_WEBHOOK_SECRET=SUBSTITUA_PELA_ASSINATURA_SECRETA_DO_WEBHOOK
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
NEXT_PUBLIC_APP_URL=https://vaporentregaspnz.com
```

Na Hostinger, `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` precisa existir durante o
build, pois valores `NEXT_PUBLIC_*` são incorporados ao bundle. Depois de trocar
credenciais, faça novo deploy completo. Public Key e Access Token devem vir da
mesma aplicação Checkout Bricks. O código rejeita mistura detectável entre TEST
e produção e divergência de application ID sem imprimir credenciais.

## Teste seguro

1. Crie a nova aplicação Checkout Bricks no painel Mercado Pago.
2. Configure somente credenciais TEST da mesma aplicação.
3. Aplique a migration incremental com `npm run db:migrate:deploy` somente depois
   de revisão e backup.
4. Cadastre uma conta Vapor nova; confirme os sete dias no painel de acesso.
5. Use conta compradora e meios de pagamento de teste oficiais, diferentes da
   conta vendedora.
6. Teste cartão aprovado, recusado e pendente.
7. Teste Pix e confirme que QR gerado não libera acesso antes da aprovação.
8. Reenvie a mesma notificação e confirme que o vencimento não muda novamente.
9. Renove antecipadamente e confirme que 30 dias são somados ao vencimento atual.

Nunca use cartão real, credencial de produção ou dinheiro real nessa validação.

## Produção

Somente após o fluxo TEST real funcionar:

1. troque as três credenciais pelas credenciais de produção da mesma aplicação;
2. defina `MERCADO_PAGO_MODE=production`;
3. mantenha `NEXT_PUBLIC_APP_URL` no domínio HTTPS público;
4. faça novo build/deploy;
5. confirme o webhook e faça uma transação controlada autorizada pelo responsável.

Testes mockados validam a lógica local, mas não validam conta, análise de risco,
credenciais, webhook público ou aprovação real do Mercado Pago.

## Troubleshooting

- `LOCAL_CREDENTIAL_ENVIRONMENT_MISMATCH`: Public Key e Access Token não estão
  coerentes com o modo ou a aplicação.
- `401` no webhook: confira segredo, URL completa e preservação dos headers.
- Pix permanece pendente: consulte o pagamento no painel e confirme o evento
  `payment`.
- Pagamento recusado: `status_detail` fica somente no log sanitizado; a resposta
  ao navegador permanece genérica.
- Build com chave antiga: atualize a variável na Hostinger e faça novo deploy;
  limpar cache do navegador não altera uma chave incorporada no bundle anterior.

Referências oficiais:

- [Payment Brick](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/introduction)
- [Renderização React](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/default-rendering)
- [Envio do pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission)
- [Pix e idempotência](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix)
