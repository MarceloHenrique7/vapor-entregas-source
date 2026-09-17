# Plano da empresa e Vapor Gestão Pro

## Situação comercial

A empresa possui o plano Gratuito. O repositório não contém preço oficial nem regra comercial aprovada para o Vapor Gestão Pro. Por isso a página compara Gratuito e Pro, mas mantém o upgrade pago desabilitado.

Nenhum valor foi inventado e nenhum checkout da assinatura de motoboy foi reaproveitado para empresas.

## Acesso Pro

Enquanto não houver preço e checkout próprios, o Pro pode ser concedido pelo admin com origem, motivo obrigatório, vencimento definido ou acesso sem vencimento e auditoria de liberação, extensão e remoção.

O entitlement exige `proEnabled=true` e, quando houver vencimento, `proExpiresAt` no futuro. A expiração bloqueia endpoints e telas Pro sem apagar dados históricos.

## Checkout futuro

Antes de ativar upgrade pago será necessário definir preço, periodicidade, regras comerciais, endpoint de pagamento, webhook idempotente e política de renovação. Esse fluxo deve permanecer isolado do VaporPay das entregas.
