# Calculadora, relatórios e integrações de pedidos

## Calculadora de frete

A empresa acessa `/app/empresa/calculadora`. O cálculo usa a `PricingRule` ativa da
cidade do ponto padrão da empresa, exatamente a mesma fonte usada pela criação de
entregas. A distância da calculadora é informada manualmente em quilômetros e fica
identificada como manual; ela não é apresentada como distância rodoviária calculada
pela Vapor.

O cálculo monetário é feito em centavos:

`máximo(preço mínimo, preço base + preço por km × distância) + adicionais informados`

Não foi aplicada a tabela histórica de R$ 6,00 a R$ 40,00 porque os intervalos de
25/26 km e o excedente ainda são ambíguos. A fonte vigente continua administrável
em `/admin/precificacao`. Antes de substituir a fórmula atual por faixas, o
proprietário precisa confirmar todas as fronteiras, o arredondamento das frações e
a regra acima de 25 km.

## Relatórios

`/app/empresa/relatorios` oferece prévia e exportação em PDF e Excel (`.xlsx`). Os
filtros disponíveis são período (máximo de 366 dias), status, motoboy e canal. Toda
consulta deriva a empresa da sessão; não existe `companyId` controlado pelo browser.

O valor base é `Delivery.offeredPrice`. Somente adicionais com estado
`ACKNOWLEDGED` entram no valor final registrado. Os totalizadores consideram
entregas concluídas e mostram separadamente o valor cujo pagamento foi confirmado.
Isso é um registro declaratório: a Vapor não recebe, custodia ou repassa valores.

Limites e segurança:

- até 10.000 entregas por arquivo;
- respostas privadas com `Cache-Control: private, no-store`;
- sem CPF, RG, e-mail, telefone ou coordenadas nos arquivos;
- células de texto iniciadas por `=`, `+`, `-` ou `@` são neutralizadas;
- planilha com abas `Entregas` e `Resumo`, cabeçalho fixo e autofiltro;
- PDF paginado com indicadores e aviso de geração.

Endpoints:

- `GET /api/company/reports`;
- `GET /api/company/reports/export?format=pdf`;
- `GET /api/company/reports/export?format=xlsx`.

## Integrações e pedidos importados

A área `/app/empresa/integracoes` possui conectores independentes. Um pedido
importado nunca cria uma entrega sozinho. A empresa precisa abrir **Solicitar
motoboy**, localizar/confirmar o PIN, revisar os campos, definir o valor e publicar.

### CSV manual

O arquivo aceita até 200 linhas e passa por prévia antes da confirmação. Cabeçalhos:

```text
external_id,canal,rua,numero,bairro,cidade,estado,cep,telefone,complemento,referencia,observacao
```

`external_id` deve ser estável no sistema de origem. A chave única
`empresa + provedor + external_id` impede duplicação.

### Webhook genérico

Cada empresa gera seu próprio segredo, mostrado uma única vez. O parceiro envia:

- `X-Vapor-Event-Id`: identificador único e estável do evento;
- `X-Vapor-Timestamp`: Unix timestamp em segundos ou milissegundos;
- `X-Vapor-Signature`: HMAC-SHA256 em hexadecimal;
- corpo JSON com no máximo 256 KB.

A mensagem assinada é o texto exato `${timestamp}.${corpo_json_exato}`. Eventos com
mais de cinco minutos são rejeitados; `connectionId + externalEventId` é único; um
evento antigo não sobrescreve um estado mais recente. Segredos ficam criptografados
no banco com `FIELD_ENCRYPTION_KEY`, e dados pessoais não entram em logs técnicos.

Exemplo de payload fictício:

```json
{
  "externalId": "pedido-123",
  "eventType": "ORDER_CREATED",
  "occurredAt": "2026-10-17T12:00:00-03:00",
  "channel": "Cardápio parceiro",
  "deliveryMode": "MERCHANT",
  "destination": {
    "address": "Rua Exemplo",
    "number": "100",
    "neighborhood": "Centro",
    "city": "PETROLINA_PE",
    "state": "PE",
    "postalCode": "56300000"
  },
  "notes": "Pedido fictício para homologação"
}
```

Pedidos com `deliveryMode=PLATFORM` são registrados sem dados de destino e não ficam
elegíveis para solicitar motoboy, evitando duplicar a logística de outra plataforma.

### iFood

O card iFood permanece em **Aguardando autorização/homologação**. Não existe
integração ativa nem credencial simulada. Para avançar são necessários aplicativo,
credenciais, autorização das lojas e homologação seguindo exclusivamente a
[documentação oficial](https://developer.ifood.com.br/pt-BR/docs/guides/order/).
Webhooks oficiais exigem validação de assinatura sobre o corpo bruto e os eventos
podem ser entregues mais de uma vez ou fora de ordem; o adapter deve continuar
isolado quando as credenciais reais forem disponibilizadas.

## Banco e implantação

Migration incremental: `20261017120000_add_order_integrations`.

Em cada ambiente, depois do backup:

```bash
npm ci
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Não há variável nova obrigatória. `FIELD_ENCRYPTION_KEY` e `NEXT_PUBLIC_APP_URL` já
existiam e são reutilizadas. Nunca troque `FIELD_ENCRYPTION_KEY` sem um plano de
rotação dos dados criptografados.
