# VaporPay

VaporPay registra a combinação e a confirmação do pagamento de uma entrega entre empresa e motoboy. A Vapor Entregas **não recebe, custodia, garante, retém ou repassa** o dinheiro da corrida.

## Dados reutilizados

- `Delivery.offeredPrice`: valor decimal informado para o motoboy.
- `Delivery.paymentMethod`: `PIX`, `CASH`, `COMPANY_SETTLEMENT` ou `OTHER`. Na interface significam, respectivamente, Pix direto pela empresa, dinheiro, a combinar e outra forma.
- Mercado Pago permanece exclusivo para o plano de acesso do motoboy. Não participa do pagamento da entrega.

## Estados

- `UNTRACKED`: registro legado criado antes do VaporPay.
- `PENDING`: entrega nova ainda sem confirmação financeira.
- `REPORTED_PAID`: a empresa declarou que pagou diretamente.
- `CONFIRMED`: o motoboy confirmou o recebimento.
- `DISPUTED`: a empresa declarou pagamento e o motoboy informou que ainda não recebeu.

Novas entregas nascem `PENDING`. A migration preserva entregas antigas como `UNTRACKED` e não remove dados.

## Transições e permissões

As ações só ficam disponíveis depois de `Delivery.status = COMPLETED`. A conclusão operacional nunca depende do pagamento.

| Ator                 | Ação                                   | Resultado                    |
| -------------------- | -------------------------------------- | ---------------------------- |
| Empresa proprietária | Marcar como pago                       | `REPORTED_PAID`              |
| Motoboy vinculado    | Confirmar recebimento                  | `CONFIRMED`                  |
| Motoboy vinculado    | Ainda não recebi, após `REPORTED_PAID` | `DISPUTED`                   |
| Motoboy vinculado    | Ainda não recebi, antes da declaração  | permanece/torna-se `PENDING` |

`CONFIRMED` é terminal na interface. Repetições idempotentes não criam efeitos duplicados. Empresa não confirma pelo motoboy; motoboy não marca pagamento pela empresa. A rota sempre verifica sessão, papel e participação na entrega.

## API e auditoria

`POST /api/deliveries/:id/payment`

Corpo aceito:

```json
{ "action": "MARK_PAID | CONFIRM_RECEIPT | REPORT_NOT_RECEIVED" }
```

Cada mudança efetiva cria `DeliveryPaymentEvent` com status anterior/novo, ator, papel e timestamp do servidor. A timeline da entrega exibe esses eventos. Notificações usam `eventKey` único para evitar spam por repetição.

## Histórico

Empresa e motoboy podem filtrar o histórico por período, status operacional e status do pagamento. Os textos deixam explícito que os dados são declarações dos participantes, e não comprovantes bancários.

## Futuro pagamento garantido

Não está habilitado. Uma futura versão exigirá PSP com produto de marketplace, KYC, subcontas/split, conciliação, reembolsos, chargebacks, disputas, idempotência e webhooks assinados. Um Pix manual não substitui essa arquitetura.
