# Deploy da Vapor Entregas em hospedagem Node.js

## Pré-requisitos

- Node.js 22.x (o `package.json` limita a faixa a `>=22 <23`);
- npm compatível com o lockfile;
- MySQL 8.0.16+ acessível pela aplicação;
- domínio apontado para a hospedagem;
- HTTPS válido antes de liberar instalação PWA ou geolocalização;
- diretório da aplicação definido como a raiz deste repositório, onde está o
  `package.json`.

Confirme que o plano de hospedagem mantém um processo Node.js persistente. O projeto
não usa Docker, serviço pago obrigatório, função serverless externa ou banco além
do MySQL configurado em `DATABASE_URL`.

## Variáveis

Cadastre no painel da hospedagem todas as chaves documentadas em `.env.example`.
Use valores reais e protegidos para `DATABASE_URL`, `AUTH_RATE_LIMIT_SECRET`,
`FIELD_ENCRYPTION_KEY` e `ADMIN_*`. Preencha `LEGAL_OPERATOR_NAME`,
`LEGAL_CONTACT_EMAIL` e um contato real em `GEOCODING_USER_AGENT` antes da produção.
Defina `NODE_ENV=production` e ajuste `NEXT_PUBLIC_APP_URL` para o domínio HTTPS.

Durante o pré-lançamento, configure `PRELAUNCH_MODE=true`. Preencha
`PRELAUNCH_TEST_USER_IDS` somente com UUIDs de contas de homologação, separados por
vírgula; deixe vazio se apenas administradores puderem entrar. Reinicie o processo
após alterar a flag. Para liberar o produto completo, use `PRELAUNCH_MODE=false`.
Nunca use e-mail, telefone ou segredo nessa lista.

Para assinaturas, use credenciais de produção do próprio operador e configure
`MERCADO_PAGO_MODE=production`, `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`,
`MERCADO_PAGO_ACCESS_TOKEN`,
`MERCADO_PAGO_WEBHOOK_SECRET` e a URL oficial em
`MERCADO_PAGO_API_BASE_URL`. O Access Token é exclusivamente server-side. Apenas
a Public Key usa o prefixo `NEXT_PUBLIC_*`.

Antes de trocar para produção, siga o checklist de
`docs/mercado-pago-subscriptions.md`, execute a sincronização administrativa dos
planos depois da migration e valide o fluxo no Sandbox. Testes mockados não
comprovam a integração real nem autorizam cobrança.

Nunca envie `.env` ao repositório, copie valores para logs ou execute seed com
credenciais provisórias de produção.

## Instalação, banco e build

No diretório da aplicação:

```bash
npm ci
npx prisma validate
npx prisma generate
npm run db:migrate:deploy
npm run build
```

`db:migrate:deploy` aplica somente migrations versionadas e incrementais. Não use
`prisma migrate reset`. Faça backup do MySQL antes de cada release. Execute
`npm run db:seed` uma única vez quando quiser criar/atualizar o admin configurado;
não coloque o seed no comando de inicialização.

## Inicialização

```bash
npm start
```

Configure o painel para expor a porta fornecida pela hospedagem ao domínio HTTPS e
reiniciar o processo em caso de falha. O diretório de trabalho deve permanecer na
raiz do projeto.

## Proxy, SSE e PWA

- permita conexões longas em `/api/deliveries/events`;
- desative buffering/compressão intermediária para `text/event-stream` quando o
  proxy oferecer essa opção;
- use timeout de conexão superior ao heartbeat de 25 segundos;
- encaminhe `Host`, `X-Forwarded-Host` e protocolo corretamente para a validação de
  origem;
- no MVP, mantenha uma única instância Node porque o broker SSE está em memória;
- não faça cache no proxy para `/api/*`, `/app/*`, `/admin/*` ou respostas com
  `private, no-store`;
- sirva `sw.js`, manifest e ícones no mesmo domínio da aplicação.

O proxy também deve encaminhar `POST /api/webhooks/mercadopago` sem cache, sem
alterar corpo, query string ou os headers `x-signature` e `x-request-id`. Cadastre
no Mercado Pago exatamente
`https://SEU_DOMINIO/api/webhooks/mercadopago?source_news=webhooks` e mantenha
o tópico de pagamentos (`payment`) habilitado. Tópicos de preapproval são
necessários somente enquanto houver contratos recorrentes legados.

O polling de contingência mantém as telas atualizadas se SSE cair. A central de
notificações permanece no MySQL. Web Push remoto não está habilitado e não
exige variável adicional.

## HTTPS e headers

A aplicação já envia CSP, `nosniff`, proteção contra frames, política de referência
e `Permissions-Policy`. Ative HSTS no proxy somente depois que HTTPS, domínio e
subdomínios estiverem corretos; ativação prematura pode dificultar recuperação de
uma configuração inválida.

## Verificação pós-deploy

1. abra `/`, `/termos`, `/privacidade` e `/manifest.webmanifest`;
2. confirme que o service worker foi registrado e que o navegador oferece instalação;
3. autentique uma empresa e um motoboy em navegadores separados;
4. teste localização, publicação, aceite, etapas, conclusão e avaliação;
5. confira `/app/*/notificacoes` e o badge de não lidas;
6. acesse `/admin` somente com a conta administrativa;
7. revise logs por correlation ID sem publicar dados pessoais;
8. confirme que APIs privadas enviam `Cache-Control: private, no-store`.
9. em produção/homologação, crie uma assinatura de teste controlado, confirme o
   webhook, sincronização, cancelamento e idempotência de evento duplicado;
10. confirme que conta sem assinatura não inicia operações, mas uma entrega já
    aceita pode ser finalizada normalmente.

Enquanto `PRELAUNCH_MODE=true`, substitua os passos operacionais por esta validação:

1. confirme que `/` mostra a landing de pré-lançamento e aceita um interesse;
2. confirme que `/entrar`, `/cadastro/*`, `/app/*` e `/admin` não ficam disponíveis
   ao visitante, mesmo com query string;
3. confirme que `/admin/acesso` autentica somente ADMIN e que
   `/admin/pre-cadastros` lista o interesse criado;
4. confirme que `/acesso/teste` autentica somente uma conta cujo UUID esteja na
   lista e que ela entra apenas nas áreas permitidas por sua própria role;
5. confirme 401/403 nas APIs privadas e ausência de cache em respostas administrativas.

## Rollback

Reimplante o commit anterior sem apagar migrations nem dados. Mudanças de schema
devem ter uma migration corretiva incremental; não resete o banco. Restaure backup
somente com procedimento operacional aprovado e após identificar o impacto. Para
o rollback específico PostgreSQL → MySQL, consulte `docs/mysql-migration.md`.
