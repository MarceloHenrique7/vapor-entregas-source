# Migração PostgreSQL → MySQL — Etapa 18

## Estado e decisão

A aplicação Vapor Entregas usa Prisma ORM 7.10 e, a partir desta etapa, tem MySQL
como datasource principal. O PostgreSQL anterior não foi resetado nem alterado.
Seu schema consolidado foi preservado em `prisma/postgresql/schema.prisma` e as 16
migrations históricas continuam em `prisma/migrations` com o lock `postgresql`.

A linha ativa do MySQL fica em `prisma/mysql/migrations`. `prisma.config.ts` aponta
o Prisma CLI para essa pasta e `prisma/schema.prisma` usa `provider = "mysql"`.
Não misture as duas árvores: SQL PostgreSQL não é executável no MySQL.

## Auditoria de incompatibilidades

- `UUID`/`@db.Uuid`: convertido em `CHAR(36)`; os IDs continuam UUID e são gerados
  pelo Prisma, preservando relações e formatos públicos existentes.
- `TIMESTAMPTZ(3)`: convertido em `DATETIME(3)`. MySQL não guarda fuso no tipo;
  instantes continuam trafegando como `Date`, o processo usa `TZ=America/Recife`
  e é recomendável manter a sessão/servidor MySQL em UTC.
- `JSONB`: convertido em `JSON`; nenhuma query dependia de operadores JSONB.
- enums PostgreSQL (`CREATE TYPE`/`ALTER TYPE`): consolidados como `ENUM` MySQL.
- casts `::text`, `::uuid`, `::jsonb`, `ON CONFLICT` e backfills com `md5`: ficam
  somente nas migrations PostgreSQL arquivadas; não existem no runtime MySQL.
- índices parciais: MySQL não os suporta. Foram substituídos por chaves internas
  nullable com índices únicos, mantidas atomicamente pelos repositories:
  `defaultCompanyKey`, `activeMotoboyKey` e `openSubscriptionUserKey`.
- busca `mode: "insensitive"`: removida porque esse modo do Prisma é específico
  do PostgreSQL. A baseline usa `utf8mb4_unicode_ci`, que fornece comparação sem
  distinção de caixa e compatível com acentos no escopo atual.
- checks geográficos, preços, ratings e coerência operacional: reescritos em SQL
  MySQL. Requerem MySQL 8.0.16+, versão a partir da qual `CHECK` é aplicado.
- foreign keys ligadas a campos usados em `CHECK`: `onUpdate: Restrict` substitui
  cascade apenas para IDs imutáveis envolvidos, requisito do MySQL.
- SQL raw: não há `$queryRaw` ou `$executeRaw` no runtime. Transações usam Prisma.
- arrays, `citext`, `RETURNING`, `ILIKE`, `Bytes`, `BigInt`, extensões UUID e
  isolation level explícito: não eram usados pelo schema/runtime.

## Baseline MySQL

`20260828190000_mysql_baseline` cria o schema consolidado, foreign keys, checks,
índices e os registros provisórios de preço/plano necessários aos módulos atuais.
Todas as tabelas usam `utf8mb4` e `utf8mb4_unicode_ci`.

Para um banco MySQL novo:

```bash
npm ci
npx prisma validate
npx prisma generate
npm run db:migrate:deploy
npm run db:seed
```

O seed é idempotente por e-mail, usa Argon2id, lê `ADMIN_*` do ambiente e não
contém nem imprime senha.

## Dados existentes

Não foi criado importador automático PostgreSQL → MySQL. Os dados incluem PII
criptografada, sessões, auditoria, relações e invariantes que exigem reconciliação
individual. Automatizar sem uma janela controlada aumentaria o risco de duplicidade
ou perda silenciosa.

Como o produto ainda está em pré-lançamento, o MySQL de produção pode começar
vazio. O PostgreSQL permanece como origem intacta. Se os pré-cadastros existentes
precisarem ser levados para produção, faça uma migração operacional separada:

1. congele escritas no PostgreSQL;
2. gere backup verificável;
3. exporte por uma ferramenta privada, sem logs de PII;
4. importe em ordem de dependência preservando UUIDs e timestamps;
5. valide contagens, chaves estrangeiras, hashes e duplicidades;
6. execute smoke funcional; só então troque o tráfego.

Não execute `prisma migrate reset`, não transforme a baseline MySQL em migration
PostgreSQL e não descarte a origem até aprovação explícita do lançamento.

## Atomicidade e transações

O aceite mantém `updateMany` condicional por `id`, status
`SEARCHING_MOTOBOY`, `motoboyId = null` e validade. InnoDB serializa a atualização
da mesma linha; somente uma transação obtém `count = 1`. A outra recebe resultado
indisponível/conflito. O índice único de `activeMotoboyKey` impede que o mesmo
motoboy mantenha duas entregas operacionais.

Foi executado teste real em MySQL 8.4.9 com uma empresa, dois motoboys online e uma
oportunidade: exatamente um aceite e um conflito, uma atribuição persistida e um
evento `ACCEPTED` no histórico.

## Testes e banco isolado

Crie um banco que termine claramente como ambiente de teste e configure apenas no
processo do teste:

```powershell
$env:MYSQL_TEST_DATABASE_URL='mysql://USER:PASSWORD@127.0.0.1:3306/vapor_mysql_test'
$env:DATABASE_URL=$env:MYSQL_TEST_DATABASE_URL
npm run db:migrate:deploy
npm run test:mysql
```

`MYSQL_TEST_DATABASE_URL` é opcional no app e obrigatória somente para
`npm run test:mysql`. Nunca aponte esse comando para produção.

## Riscos

- Hostinger precisa oferecer MySQL 8.0.16+ e acesso TCP para a aplicação Node.
- `DATETIME` não carrega timezone; valide relógio do servidor, Node e UI.
- TLS, hostname e allowlist de rede dependem dos dados exibidos no painel da
  Hostinger; não presuma `localhost`.
- O broker SSE continua em memória e requer uma instância Node no MVP.
- As chaves internas de unicidade são responsabilidade dos repositories. Toda nova
  escrita que altere status/default deve atualizá-las na mesma transação.
- A origem PostgreSQL e o MySQL divergem após novas escritas; não há replicação.

## Rollback antes do lançamento

1. interrompa o tráfego para a versão MySQL;
2. reimplante o último commit PostgreSQL conhecido;
3. restaure a configuração PostgreSQL original de `DATABASE_URL` somente no painel
   seguro, nunca no Git;
4. use o schema preservado e as migrations `prisma/migrations`;
5. valide o PostgreSQL intacto antes de reabrir tráfego;
6. preserve o MySQL para investigação, sem importar de volta automaticamente.

Rollback não envolve reset, drop ou sobrescrita do PostgreSQL.

## Hostinger

O procedimento completo está em `docs/hostinger-mysql-deploy.md`.
