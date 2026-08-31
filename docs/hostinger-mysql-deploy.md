# Deploy MySQL na Hostinger Business

## Pré-requisitos

- plano com aplicação Node.js persistente e Node 22;
- MySQL 8.0.16+ acessível pela aplicação;
- domínio e HTTPS configurados;
- repositório no diretório cujo `package.json` fica na raiz;
- backup do ambiente anterior e janela de implantação.

Docker não faz parte da arquitetura.

## 1. Criar banco e usuário

No painel Hostinger, crie um banco MySQL dedicado e um usuário exclusivo para a
Vapor Entregas. Conceda as permissões necessárias para criar/alterar tabelas e
índices durante `prisma migrate deploy`. Anote, sem colocar no Git:

- host;
- porta (normalmente 3306, confirme no painel);
- nome do banco;
- username;
- password;
- exigência de TLS e regras de origem/rede.

Não use a conta administrativa global do banco como usuário diário da aplicação.

## 2. Montar `DATABASE_URL`

Formato sem credenciais reais:

```dotenv
DATABASE_URL="mysql://usuario:senha@host:3306/banco"
```

Usuário, senha e banco devem usar URL encoding. Por exemplo, `@` em uma senha vira
`%40`, `:` vira `%3A` e `/` vira `%2F`. Use uma ferramenta local confiável ou
`encodeURIComponent` e nunca cole o resultado em logs/README.

Não adicione parâmetros de TLS por tentativa. Use exatamente os requisitos
documentados pelo painel Hostinger e valide a cadeia de certificados.

## 3. Configurar variáveis

Cadastre no painel Node.js todas as chaves de `.env.example`. No mínimo, revise:

- `NODE_ENV=production`;
- `NEXT_PUBLIC_APP_NAME=Vapor Entregas`;
- `NEXT_PUBLIC_APP_URL=https://SEU_DOMINIO`;
- `TZ=America/Recife`;
- `DATABASE_URL` MySQL;
- `AUTH_RATE_LIMIT_SECRET`;
- `SESSION_TTL_DAYS`;
- `FIELD_ENCRYPTION_KEY`;
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_PASSWORD`;
- `PRELAUNCH_MODE=true`;
- `PRELAUNCH_TEST_USER_IDS` somente com UUIDs autorizados;
- mapa/geocoding, contato jurídico e assinatura já documentados no exemplo.

Para Mercado Pago, revise explicitamente `MERCADO_PAGO_MODE`, Public Key, Access
Token, segredo de webhook, API base e `NEXT_PUBLIC_APP_URL` HTTPS. Public Key e
Access Token devem pertencer à mesma aplicação/ambiente. Depois do deploy,
sincronize os planos em `/admin/assinaturas` e siga
`docs/mercado-pago-subscriptions.md`; não reutilize credenciais ou IDs Sandbox.

Os nomes efetivamente usados pelo projeto são `AUTH_RATE_LIMIT_SECRET` e
`FIELD_ENCRYPTION_KEY`; não crie aliases não utilizados como `AUTH_SECRET` ou
`ENCRYPTION_KEY`. Não copie `.env.example` por cima de um `.env` real.

## 4. Instalar, validar e migrar

Na raiz da aplicação:

```bash
npm ci
npx prisma validate
npx prisma generate
npm run db:migrate:deploy
```

Confirme que somente `20260828190000_mysql_baseline` é apresentada na linha MySQL
inicial e que termina como aplicada. Nunca execute `prisma migrate reset`.

## 5. Seed administrativo

Depois de revisar `ADMIN_*` no painel:

```bash
npm run db:seed
```

O comando é idempotente. Execute de forma controlada, não em todo start. Apague a
senha do histórico do terminal se o painel a tiver exposto durante a configuração.

## 6. Build e start

```bash
npm run build
npm start
```

Configure o comando de start no painel, o diretório da aplicação e a porta fornecida
pela hospedagem. Ative reinício do processo em falha.

## 7. Proxy, SSE e PWA

- mantenha conexão longa e sem buffering em `/api/deliveries/events`;
- use timeout acima do heartbeat SSE de 25 segundos;
- encaminhe `Host`, `X-Forwarded-Host` e protocolo;
- não faça cache de `/api/*`, `/app/*`, `/admin/*` nem respostas `private, no-store`;
- sirva manifest, `sw.js` e ícones no mesmo domínio;
- mantenha uma instância Node no MVP, pois o broker SSE é local ao processo.

## 8. Validação pós-deploy

1. confirme conexão e `prisma migrate status`;
2. abra `/`, `/form`, `/termos`, `/privacidade` e o manifest;
3. envie um pré-cadastro e confirme “Você está na lista!”;
4. entre por `/admin/acesso` e confira `/admin/pre-cadastros`;
5. teste 401/403 nas APIs privadas;
6. com conta de homologação autorizada, teste empresa, motoboy, aceite e conclusão;
7. confirme notificações/SSE e fallback;
8. verifique cookies `HttpOnly`, `Secure` e `SameSite` no domínio HTTPS;
9. revise logs sem PII ou secrets;
10. confirme `utf8mb4`, acentos, ç e emoji em conteúdo não sensível de teste.

## 9. Rollback

Antes do lançamento, se qualquer critério falhar, retire a versão MySQL do tráfego,
reimplante a versão PostgreSQL anterior e restaure sua URL somente nas variáveis
protegidas. O PostgreSQL original deve permanecer intacto. Não importe dados em
sentido inverso automaticamente e não resete nenhum dos bancos.
