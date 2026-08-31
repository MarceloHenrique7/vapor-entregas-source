# Vapor Entregas

Plataforma web local de intermediação tecnológica entre empresas que publicam
oportunidades de entrega e motoboys independentes que podem aceitá-las livremente.

O repositório contém as **Etapas 1 a 18** do MVP: base Next.js, MySQL/Prisma,
autenticação segura, identidade visual, cadastros, ponto privado de coleta da
empresa, presença do motoboy, oportunidades, aceite atômico e fluxo operacional
até a conclusão, com timeline, histórico, avaliações, favoritos, denúncias,
administração, privacidade, PWA, central persistente de notificações, histórico
empresarial, adicionais operacionais, precificação e assinaturas mensais da
plataforma. A Etapa 16 consolida QA e preparação de deploy; a Etapa 17 aplica a
marca Vapor Entregas e o modo seguro de pré-lançamento.

O inventário e as decisões de compatibilidade do rebranding estão em
[`docs/rebranding-vapor-entregas.md`](docs/rebranding-vapor-entregas.md).

A Etapa 18 migra o runtime para MySQL 8 visando a Hostinger Business. O histórico
PostgreSQL continua preservado e a estratégia/rollback estão documentados em
[`docs/mysql-migration.md`](docs/mysql-migration.md).

## Modelo operacional

A Vapor Entregas conecta usuários e organiza oportunidades. A plataforma não realiza
a entrega, não emprega o motoboy e não processa o pagamento da corrida. O
pagamento acontece diretamente entre empresa e motoboy.

O MVP não solicita upload ou número de CNH, fotos de documentos, selfie ou foto da
moto. CPF, RG e CPF/CNPJ são tratados como dados privados, criptografados e nunca
publicados no mapa.

## Pré-lançamento — Etapa 17

Com `PRELAUNCH_MODE=true`, `/` exibe somente a landing leve da Vapor Entregas e o
formulário de interesse. Login comum, cadastros, painéis e APIs privadas ficam
bloqueados inclusive quando recebem query strings. Termos, Privacidade, PWA e o
`POST /api/pre-registration` permanecem públicos.

O acesso administrativo fica em `/admin/acesso` e o acesso de homologação em
`/acesso/teste`; nenhum deles aparece na landing. O primeiro autentica exclusivamente
`ADMIN`, enquanto o segundo autentica exclusivamente UUIDs listados em
`PRELAUNCH_TEST_USER_IDS`. Ambos usam Argon2, rate limit, sessão persistida e cookies
do fluxo existente, sem senha paralela, segredo na URL ou credencial hardcoded.
Depois do gate, o RBAC normal continua valendo: uma conta de teste `COMPANY`, por
exemplo, recebe 403 em APIs administrativas.

A allowlist server-side é exata: `/`, `/form`, os dois acessos restritos, Termos,
Privacidade, manifest, robots, service worker, favicon, os ícones conhecidos e os
três POSTs de pré-lançamento. `/api/auth/login`, registros, logout, webhook e todas as
demais páginas/APIs ficam bloqueados por padrão enquanto a flag estiver ativa.

O pré-cadastro coleta somente nome, WhatsApp e tipo (`MOTOBOY` ou `COMPANY`). O
servidor normaliza o telefone, deduplica por telefone + tipo, registra a versão do
aviso e o horário do servidor. Não existe endpoint público de listagem. A consulta
e a exportação CSV ficam em `/admin/pre-cadastros`.

Para voltar ao produto completo sem remover código ou dados, configure
`PRELAUNCH_MODE=false` e reinicie o processo Node. Não altere a lista por e-mail:
`PRELAUNCH_TEST_USER_IDS` aceita somente UUIDs separados por vírgula.

## Requisitos

- Node.js 22.x;
- npm 10 ou superior;
- MySQL 8.0.16 ou superior instalado localmente, ou o MySQL remoto da Hostinger
  acessível por URL de conexão.

## Instalação

```bash
npm ci
```

Se o projeto ainda não possuir `.env`, use `.env.example` como referência para
criá-lo e troque os valores marcados como exemplo. **Nunca copie o exemplo por cima
de um `.env` já configurado.**
O Prisma CLI lê `.env`; o arquivo está ignorado pelo Git.

Para gerar um segredo do rate limit:

```bash
openssl rand -base64 32
```

Gere também a chave de criptografia de CPF, RG e CPF/CNPJ:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

O segredo deve ser exclusivo por ambiente e configurado como variável protegida
na hospedagem.

Antes do lançamento comercial, preencha também `LEGAL_OPERATOR_NAME` e
`LEGAL_CONTACT_EMAIL` com a identificação responsável e o canal jurídico/privacidade
reais. Quando ausentes em desenvolvimento, as páginas exibem uma pendência explícita
em vez de inventar razão social, CNPJ, endereço, telefone ou e-mail.

## MySQL

O projeto não usa Docker, Docker Desktop ou Docker Compose. Prisma e a aplicação
acessam o MySQL exclusivamente pela variável `DATABASE_URL`. O runtime usa
`@prisma/adapter-mariadb`, compatível com MySQL via TCP.

### Opção 1: MySQL instalado diretamente no Windows

1. Instale MySQL 8 e defina uma senha forte para o usuário administrativo.
2. Pelo MySQL Shell/Client ou Workbench, crie banco e usuário exclusivos:

```sql
CREATE DATABASE vapor_entregas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Configure `.env` manualmente, sem copiá-lo por cima:

```dotenv
DATABASE_URL="mysql://USUARIO:SENHA_CODIFICADA@127.0.0.1:3306/vapor_entregas"
```

Conceda ao usuário da migration permissões para criar e alterar objetos. Caracteres
especiais no usuário ou senha precisam de URL encoding.

Confirme que o serviço do MySQL está iniciado no Windows antes de executar as
migrations.

### Opção 2: MySQL remoto da Hostinger

Crie banco e usuário MySQL no painel da Hostinger e use host, porta, banco e
credenciais fornecidos pelo próprio painel.

Copie a URL fornecida pelo servidor para `.env`:

```dotenv
DATABASE_URL="mysql://USUARIO:SENHA_CODIFICADA@HOST:3306/BANCO"
```

O requisito de TLS depende da configuração exibida pela Hostinger. Em produção,
mantenha a URL somente nas variáveis protegidas, confirme as regras de acesso de
rede e não versione credenciais. Veja `docs/hostinger-mysql-deploy.md`.

## Migrations e seed

Com o MySQL ativo e o `.env` configurado:

```bash
npm run db:migrate:deploy
npm run db:seed
```

O primeiro comando aplica as migrations versionadas. O seed cria ou atualiza o
administrador definido por `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE` e
`ADMIN_PASSWORD`. A senha é armazenada somente como hash Argon2id.

Durante o desenvolvimento de uma nova migration, use:

```bash
npm run db:migrate -- --name nome_da_alteracao
```

Outros comandos úteis:

```bash
npm run db:generate
npm run db:studio
```

## Autenticação e autorização

- `POST /api/auth/login`: valida credenciais e cria a sessão;
- `POST /api/auth/logout`: revoga a sessão atual;
- `GET /api/auth/session`: retorna somente os dados públicos da sessão;
- `POST /api/auth/register/motoboy`: cria somente role `MOTOBOY`;
- `POST /api/auth/register/company`: cria somente role `COMPANY`;
- cookie de sessão `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- somente o SHA-256 do token da sessão é persistido;
- senhas usam Argon2id;
- cinco falhas bloqueiam temporariamente a conta;
- tentativas também são limitadas por endereço de rede anonimizado com HMAC;
- requisições que alteram a sessão validam a origem;
- `proxy.ts` faz a triagem de presença do cookie;
- layouts e guards consultam a sessão no banco e validam `MOTOBOY`, `COMPANY` ou
  `ADMIN` no servidor.

CPF, RG e CPF/CNPJ são criptografados com AES-256-GCM. Impressões HMAC permitem
controle de duplicidade sem guardar documentos em texto. Esses campos nunca são
retornados pelas APIs públicas de autenticação.

Teste manual do login local, enviando a origem exigida:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"admin@vapor.local","password":"SUA_SENHA"}'
```

## Execução

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Mapa e localização da empresa

A Etapa 4 usa Leaflet/React-Leaflet com tiles do OpenStreetMap. A busca de endereço
passa por um adapter server-side configurável e usa Nominatim por padrão. Não há
API paga nem conta externa obrigatória: se o geocoder estiver indisponível, a
empresa ainda pode clicar no mapa ou arrastar o PIN e salvar manualmente.

Configure no `.env`:

```dotenv
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
GEOCODING_PROVIDER=nominatim
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org
GEOCODING_USER_AGENT=VaporEntregas/1.0 (contato: seu-email@exemplo.com)
GEOCODING_CACHE_TTL_SECONDS=86400
```

Use um contato real no `GEOCODING_USER_AGENT`. Para executar o MVP somente com
posicionamento manual, defina `GEOCODING_PROVIDER=disabled`. O endereço base e a
URL dos tiles podem ser trocados sem alterar as regras de localização.

Para testar:

1. aplique `npm run db:migrate:deploy` e inicie com `npm run dev`;
2. entre com um usuário `COMPANY` e abra
   `/app/empresa/configuracoes/localizacao`;
3. revise CEP, rua, número, bairro, cidade e os campos opcionais;
4. clique em **Localizar endereço**; se não houver resultado, use o centro inicial
   de Petrolina ou Juazeiro e ajuste o mapa manualmente;
5. clique no mapa ou arraste o PIN até a entrada e escolha **Salvar localização**;
6. recarregue a tela para confirmar que o ponto padrão foi persistido; para editar,
   altere os dados ou mova o PIN e salve novamente.

O endpoint público do Nominatim é compartilhado e de melhor esforço. O adapter
mantém cache em memória, serializa as chamadas e limita o uso a ações explícitas
ou ao ajuste final do PIN com debounce. Não faça geocodificação em lote, autocomplete
por tecla, prefetch de tiles ou uso offline do servidor público. Uma implantação
com volume maior deve apontar as variáveis para infraestrutura própria ou outro
provider compatível com sua política de uso.

## Disponibilidade e localização do motoboy

A Etapa 5 guarda somente o estado atual e a última localização conhecida no
`MotoboyProfile`. Não existe tabela de histórico ou trilha contínua de GPS. As
coordenadas são privadas, não aparecem no dashboard, não são devolvidas pelas APIs
de presença e não são disponibilizadas a empresas.

Configure a validade da presença e o limite mínimo do backend:

```dotenv
ONLINE_PRESENCE_TTL_MINUTES=10
PRESENCE_LOCATION_MIN_INTERVAL_SECONDS=30
```

Para testar no navegador:

1. aplique `npm run db:migrate:deploy`, inicie a aplicação e entre como `MOTOBOY`;
2. abra `/app/motoboy` e clique em **Ficar online**;
3. quando o navegador solicitar localização, escolha **Permitir**;
4. confirme o estado verde, a permissão e os horários exibidos;
5. clique em **Ficar offline** e confirme que o navegador deixa de observar o GPS;
6. para testar a negativa, bloqueie a localização nas permissões do site e use
   **Tentar novamente**; o servidor não marcará o perfil como online;
7. para testar nova autorização, libere a localização nas configurações do site,
   recarregue e tente novamente.

Enquanto online, o navegador observa a posição, mas só tenta enviar ao backend
quando o deslocamento aproximado chega a 150 metros ou após 5 minutos. Há também
um cooldown local de 30 segundos e um intervalo mínimo configurável no servidor.
A distância é Haversine em linha reta, não distância viária.

Ao ficar offline, fazer logout ou sair da área do motoboy, o `watchPosition` é
interrompido. O logout normal também grava `isOnline=false`. Se o navegador fechar,
o celular desligar ou a conexão cair antes dessa chamada, a presença deixa de ser
considerada disponível quando `lastLocationAt` ultrapassa o TTL, sem cron job ou
serviço externo.

## Entregas, oportunidades e aceite atômico

A Etapa 6 permite que a empresa publique uma oportunidade usando seu ponto padrão
de coleta. O destino é confirmado por PIN, e distância, valor oferecido, forma de
pagamento direto e observações são exibidos ao motoboy antes do aceite.

Para testar o fluxo:

1. aplique `npm run db:migrate:deploy` e entre como empresa;
2. confirme o ponto padrão em `/app/empresa/configuracoes/localizacao`;
3. abra `/app/empresa/entregas/nova`, preencha o destino, confirme o PIN e publique;
4. em outra sessão, entre como motoboy, fique online e abra
   `/app/motoboy/oportunidades`;
5. confira coleta, destino, distâncias em linha reta, valor e pagamento;
6. aceite livremente; a empresa receberá a atualização em tempo real e os demais
   motoboys deixarão de conseguir aceitar a mesma oportunidade;
7. abra `/app/motoboy/corrida` para executar as etapas operacionais na ordem.

O aceite usa transação e `UPDATE` condicional no MySQL. Somente uma operação
consegue alterar simultaneamente uma entrega disponível para `ACCEPTED`. A coleta
é obtida no servidor pelo usuário da sessão; IDs ou coordenadas de coleta enviados
pelo navegador são ignorados.

O realtime usa Server-Sent Events em `/api/deliveries/events`. Cada conexão é
autorizada no backend e recebe somente eventos compatíveis com seu perfil. O broker
é local ao processo Node e não exige Redis nem serviço externo. Essa solução é
adequada à implantação MVP em processo único; uma futura implantação com múltiplas
instâncias deverá substituir o broker por infraestrutura compartilhada.

A Vapor Entregas não processa o valor oferecido. PIX, dinheiro, acerto com o
estabelecimento ou outra forma são apenas informações para pagamento direto entre
empresa e motoboy.

## Fluxo operacional e histórico

A Etapa 7 permite somente esta sequência, sempre validada no backend:

`ACCEPTED → MOTOBOY_TO_PICKUP → ARRIVED_AT_PICKUP → PICKED_UP → IN_DELIVERY → COMPLETED`

O motoboy vinculado usa `/app/motoboy/corrida`; a empresa acompanha em
`/app/empresa/entregas/{id}`. Coleta e destino oferecem links para Google Maps e
Waze, sem navegação própria. Ao concluir, `completedAt` recebe o horário do servidor
e o índice de corrida ativa deixa o motoboy livre para aceitar outra oportunidade.

Cada alteração grava status anterior, novo status, usuário, role, observação e
horário do servidor em `DeliveryStatusHistory`. Atualizações usam SSE autenticado;
um polling conservador de 30 segundos funciona como contingência. O broker continua
local ao processo Node do MVP e não exige serviço externo.

Empresa pode cancelar enquanto a entrega está procurando motoboy, aceita, a caminho
ou aguardando coleta. Motoboy vinculado pode cancelar desde o aceite até a chegada
à coleta. Depois de `PICKED_UP`, cancelamento normal é bloqueado; depois de
`COMPLETED`, nenhuma das partes pode cancelar. Não há punição automática.

Históricos ficam em `/app/empresa/historico` e `/app/motoboy/historico`, com filtros
por período e status. O valor é rotulado como informativo e nunca como extrato,
saldo ou repasse.

## Avaliações, favoritos e denúncias

Após `COMPLETED`, empresa avalia o motoboy e motoboy avalia a empresa com 1 a 5
estrelas e comentário opcional. A contraparte é derivada da entrega no servidor;
não existe `reviewedUserId` controlado pelo navegador. A constraint
`deliveryId + reviewerUserId` impede duplicação. Médias usam agregação do MySQL
e são exibidas com uma casa decimal. Comentários recebidos permanecem privados.

No histórico da empresa, **Favoritar motoboy** cria uma relação única entre os
perfis. `/app/empresa/favoritos` mostra nome, média, quantidade de avaliações,
entregas concluídas e presença efetiva, sem expor localização. Favoritos não recebem
prioridade automática.

Empresa e motoboy podem denunciar somente a contraparte de uma entrega em que
participaram. Categoria e descrição são validadas, a descrição é renderizada como
texto, um fingerprint bloqueia repetição idêntica e há limite de cinco denúncias por
hora por processo. Usuários consultam apenas suas próprias denúncias em
`/app/empresa/denuncias` ou `/app/motoboy/denuncias`. Não há endpoint público para
alterar status; a moderação é isolada nas APIs administrativas da Etapa 9.

## Testar os cadastros e redirecionamentos

1. Aplique migrations e seed com `npm run db:migrate:deploy` e `npm run db:seed`.
2. Abra `/cadastro/empresa`, preencha os campos e aceite Termos e Privacidade. O
   sucesso redireciona para `/app/empresa`.
3. Abra `/cadastro/motoboy`, use um CPF matematicamente válido, preencha RG e as
   declarações obrigatórias. O sucesso redireciona para `/app/motoboy`.
4. Saia pelo menu e entre novamente em `/entrar`. A role direciona motoboy para
   `/app/motoboy`, empresa para `/app/empresa` e o administrador do seed para
   `/admin`.

Cadastros públicos não aceitam role enviada pelo navegador e nunca criam `ADMIN`.

## Assinaturas mensais da plataforma

A Etapa 19 cobra exclusivamente o acesso mensal à Vapor Entregas. Os planos ativos
são persistidos no MySQL e começam com R$ 19,90/mês para `MOTOBOY` e R$ 29,90/mês
para `COMPANY`; o administrador pode alterar preço, teste grátis e disponibilidade
em `/admin/assinaturas`, com auditoria. A landing e `/planos`
consultam esses dados, evitando valores espalhados no frontend.

O checkout recorrente usa planos associados da API oficial de Assinaturas do
Mercado Pago por um adapter server-side. A aplicação sincroniza
`/preapproval_plan`, cria uma preapproval pendente e redireciona o
usuário para o checkout hospedado; número de cartão, CVV e credenciais de pagamento
nunca passam pela Vapor Entregas. O webhook assinado consulta novamente o recurso no
provider antes de mudar o status local. Evento, assinatura e cobrança são
persistidos atomicamente; faturas/pagamentos repetidos não duplicam histórico.

Arquitetura, Sandbox, produção, status e troubleshooting estão em
[`docs/mercado-pago-subscriptions.md`](docs/mercado-pago-subscriptions.md).

Configure somente no ambiente, sem sobrescrever um `.env` existente:

```dotenv
MERCADO_PAGO_MODE=test
MERCADO_PAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN_DE_TESTE
MERCADO_PAGO_WEBHOOK_SECRET=SEU_SEGREDO_DO_WEBHOOK
MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No Mercado Pago, valide a URL HTTPS pública terminada em
`/api/webhooks/mercadopago?source_news=webhooks` e habilite os tópicos de assinaturas/preapproval e
pagamentos recorrentes autorizados. Em desenvolvimento local, o checkout pode ser
criado com credenciais TEST, mas o webhook exige um túnel HTTPS temporário ou um
ambiente de homologação acessível; nenhum túnel é dependência do aplicativo.

Status `TRIAL` e `ACTIVE` válidos liberam novas ações operacionais. Sem acesso
válido, empresa não publica e motoboy não fica online nem aceita novas
oportunidades. A visualização dos planos e oportunidades, histórico, conta,
documentos legais, cancelamento da assinatura e
uma corrida já aceita continuam acessíveis. `PAST_DUE` não é tratado como pagamento
confirmado; `PAUSED` é mantido separadamente. O valor da entrega continua sendo acertado diretamente entre empresa e
motoboy e não tem relação com esta assinatura.

## QA final

A matriz reproduzível da Etapa 16 está em [`docs/qa-final.md`](docs/qa-final.md).
Ela cobre os fluxos de empresa, motoboy e administrador, concorrência no aceite,
assinaturas, segurança, privacidade, PWA, mobile e critérios de produção. Testes
automatizados reais usam fixtures efêmeros e não resetam o banco.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
```

O teste de integração real com MySQL é executado explicitamente, preserva os
dados preexistentes e remove apenas os fixtures efêmeros que ele próprio criou:

```powershell
$env:RUN_DB_INTEGRATION='1'
npx vitest run src/server/stage11-flow.integration.test.ts
```

O teste crítico específico do MySQL exige um banco isolado e nunca pode apontar
para produção:

```powershell
$env:MYSQL_TEST_DATABASE_URL='mysql://USER:PASSWORD@127.0.0.1:3306/vapor_mysql_test'
npm run test:mysql
```

Com `npm run dev` ativo em `127.0.0.1:3000`, o smoke autenticado percorre as APIs
operacionais, reputação, conta, notificações e administração:

```powershell
$env:RUN_API_INTEGRATION='1'
npx vitest run src/server/stage11-api.integration.test.ts
```

## Scripts

- `npm run dev`: servidor local;
- `npm run lint`: análise estática;
- `npm run typecheck`: validação de tipos;
- `npm test`: testes automatizados;
- `npm run test:mysql`: integração real de autenticação, pré-cadastro e aceite concorrente;
- `npm run format:check`: valida a formatação;
- `npm run build`: build de produção;
- `npm run db:generate`: gera o Prisma Client;
- `npm run db:migrate`: cria/aplica migrations em desenvolvimento;
- `npm run db:migrate:deploy`: aplica migrations versionadas;
- `npm run db:seed`: configura o administrador inicial;
- `npm run db:studio`: abre o Prisma Studio.

## Deploy em hospedagem Node.js

A aplicação usa Node.js 22 e Next.js. Confirme no plano contratado que existe um
runtime Node.js persistente e acesso ao MySQL; recursos e nomes comerciais da
hospedagem podem mudar. Configure os segredos no painel da hospedagem, nunca no Git.
As instruções completas estão em [`docs/hostinger-mysql-deploy.md`](docs/hostinger-mysql-deploy.md).

O MySQL pode ser o recurso incluído na Hostinger ou um servidor compatível escolhido
pelo responsável pelo projeto. Não existe integração obrigatória com fornecedor
externo. Não execute o seed a cada
inicialização da aplicação; use-o explicitamente durante a preparação do ambiente.

## Painel administrativo e moderação

O administrador criado pelo seed entra em `/entrar` e é direcionado para `/admin`.
O painel oferece visão geral, usuários, entregas, denúncias e auditoria, sempre com
paginação server-side. As páginas e todas as APIs `/api/admin/*` repetem a checagem
de sessão, role `ADMIN` e conta ativa no servidor.

Suspensão e banimento exigem confirmação. Ambas revogam sessões ativas, encerram a
presença do motoboy e bloqueiam login e operações futuras sem apagar histórico. A
reativação libera um novo login. O status `BLOCKED` existente é apresentado como
“Banido”, evitando um segundo estado equivalente.

A busca por CPF/CNPJ aceita somente valor exato, é enviada no corpo de um `POST` e
comparada pelo fingerprint criptográfico já existente. Documentos não aparecem em
URLs, logs ou listagens. Detalhes nunca retornam hashes, tokens, coordenadas ou
segredos. Mudanças de conta e de denúncia gravam `AdminAction`; `/admin/auditoria`
é exclusivamente leitura.

Para testar moderação, abra `/admin/usuarios`, escolha uma conta não administrativa
e suspenda ou bana com um motivo. A sessão dessa conta deixa de ser válida
imediatamente. Reative-a para permitir um novo login. Em `/admin/denuncias`, o fluxo
permitido é aberta → em análise → resolvida/descartada, com reabertura para em
análise. Notas administrativas são privadas.

## Privacidade e configurações da conta

Termos e Política são públicos em `/termos` e `/privacidade`, versionados pelas
constantes de produto. Novos cadastros registram `LegalAcceptance` para Termos e
Privacidade. A migration preserva e copia os aceites das tabelas legadas, sem
atribuir silenciosamente uma versão nova a usuários antigos.

Empresa e motoboy acessam **Configurações** para consultar dados básicos, corrigir
nome, telefone e nome fantasia quando aplicável, alterar senha, exportar dados e
encerrar a conta. Alterações e exportação exigem a senha atual. A troca usa Argon2id,
revoga as sessões anteriores e cria uma nova sessão para o dispositivo atual.

A exportação JSON deriva o usuário exclusivamente da sessão e não inclui hash de
senha, hash de sessão, token ou segredo. O encerramento exige a frase
`ENCERRAR MINHA CONTA` e é bloqueado com entrega operacional ou disputa pendente.
Quando permitido, revoga sessões, encerra presença, anonimiza identificadores e
localização e mantém históricos que podem ser necessários para segurança, direitos,
denúncias, disputas e auditoria. Nenhum prazo jurídico fixo foi inventado.

## PWA e notificações

O app publica manifest, metadata, ícones 192/512, ícone maskable e service worker.
O cache é restrito ao shell público e a assets estáticos. Rotas `/api`, `/app`,
`/admin`, autenticação e cadastro nunca entram no cache; respostas `private`,
`no-store` ou com cookie também são rejeitadas. O app não promete operação completa
offline. Instalação e geolocalização exigem HTTPS em produção.

Os ícones em `public/icons` seguem a identidade provisória atual e são tecnicamente
adequados para instalação. Antes do lançamento, a marca final deve aprovar ou
substituir os três PNGs mantendo os tamanhos e o contraste do ícone maskable.

A central em `/app/empresa/notificacoes` e `/app/motoboy/notificacoes` persiste no
MySQL avisos de oportunidade, aceite, status, cancelamento, conclusão e mudança
em denúncia. É possível marcar uma ou todas como lidas, e o badge consulta somente
a contagem do titular. SSE atualiza corridas rapidamente; polling de 30 segundos é
ativado apenas quando SSE falha.

O service worker já entende eventos Web Push, mas o MVP não cadastra subscriptions
nem envia push por VAPID. Assim, não há Firebase, serviço pago ou variável obrigatória
de push. A central interna continua plenamente funcional. Uma futura ativação de
push exige implementar opt-in, armazenamento de subscription, VAPID e política de
revogação antes de criar variáveis de produção.

## Limites atuais do MVP

Pagamento, carteira, CNH, upload de documentos, rastreamento GPS permanente e push
remoto permanecem deliberadamente fora do escopo. O broker SSE é local ao processo:
use uma única instância Node no MVP ou adote um broker compartilhado antes de escalar
horizontalmente. Os textos jurídicos e a identidade visual provisória precisam de
aprovação profissional antes do lançamento.

## Histórico empresarial e motoboys anteriores — Etapa 12

O ambiente de referência usa `TZ=America/Recife`; datas persistidas continuam sendo
timestamps do servidor e são apresentadas em português brasileiro. O `.env.example`
documenta esse valor, sem alterar automaticamente o `.env` local.

Em `/app/empresa/historico`, a empresa consulta todas as entregas próprias com
paginação e filtros executados no MySQL por período, status, motoboy, cidade e
texto de endereço/bairro. Cada registro abre o detalhe operacional existente e o
contexto histórico com timeline, avaliações e denúncias feitas pela própria
empresa. A autorização usa a empresa derivada da sessão; IDs de outra empresa
retornam como recurso inexistente e não revelam dados.

`/app/empresa/motoboys` reúne somente motoboys que já concluíram uma entrega para a
empresa autenticada. A tela mostra nome público, reputação agregada, quantidade de
entregas em conjunto, data mais recente, favorito e presença efetiva conforme o TTL
já vigente. Coordenadas, telefone, e-mail e documentos não são selecionados. O
detalhe `/app/empresa/motoboys/[id]` lista o relacionamento paginado.

O botão **Repetir entrega** abre `/app/empresa/entregas/nova?repetir=<id>` e preenche
um rascunho com destino, PIN, valor, forma de pagamento e observações permitidas. O
ponto de coleta continua sendo o padrão atual da empresa, e nenhuma oportunidade é
publicada até a revisão e o envio explícito do formulário.

## Regras operacionais e adicionais — Etapa 13

A página pública `/regras` apresenta linguagem própria da Vapor Entregas para espera,
retorno, compra, peso/volume especial, cancelamento após deslocamento e outras
condições. É uma minuta operacional sujeita a revisão jurídica profissional e não
define jornada, exclusividade, punição por recusa ou vínculo empregatício.

Na criação de entrega, a empresa pode declarar até dez adicionais conhecidos. Cada
registro contém tipo, descrição, valor informativo opcional, observação, autor,
estado e horário do servidor. A oportunidade mostra esses dados antes do aceite e,
quando existe condição pendente, exige que o motoboy confirme que leu as condições.
Essa ciência não obriga o aceite.

Depois do aceite, empresa ou motoboy vinculado pode registrar uma nova condição
pelos detalhes da corrida. O registro fica `PENDING` até a contraparte escolher
`ACKNOWLEDGED` ou `REJECTED`. Não existe edição silenciosa: cada ação ganha uma
entrada em `DeliveryExtraHistory`, e o valor original de `Delivery.offeredPrice`
permanece inalterado. SSE sinaliza a mudança para as duas partes.

Os valores de adicionais continuam sendo combinados e pagos diretamente entre as
partes. A Vapor Entregas não recebe, guarda ou repassa esses valores e não cria saldo,
carteira ou movimentação financeira.

APIs adicionadas:

- `POST /api/deliveries/[id]/extras`;
- `POST /api/deliveries/[id]/extras/[extraId]/respond`.

Ambas exigem sessão, participação na entrega, origem válida, Zod e rate limit. Uma
parte não pode confirmar o próprio adicional, alterar entrega alheia ou incluir
condição fora da fase operacional.

## Distância e preço sugerido — Etapa 14

A publicação agora consulta `POST /api/deliveries/quote` depois que a empresa
confirma o PIN do destino. O servidor recalcula a distância entre o ponto padrão
de coleta e o destino e retorna uma sugestão baseada na regra ativa da cidade. A
empresa pode usar ou ajustar a sugestão antes de publicar; `offeredPrice` continua
sendo o valor final informado e visto pelo motoboy antes do aceite.

O provider inicial é gratuito e calcula distância geográfica com Haversine. Por
isso, a interface identifica explicitamente a estimativa como **linha reta, não
distância viária**. `DISTANCE_PROVIDER=straight_line` deixa a escolha explícita e o
adapter em `src/server/routing` permite substituir a implementação futuramente sem
acoplar o fluxo de entregas. Google Maps e Waze continuam sendo apenas links de
navegação externa nas corridas.

As regras provisórias ficam em `PricingRule`, separadas por cidade, com preço-base,
preço por quilômetro, mínimo e período de vigência. Um ADMIN ativo pode criar uma
nova versão em `/admin/precificacao`; a versão anterior é encerrada e a ação entra
na auditoria. A entrega salva `distanceEstimateKm`, `distanceMethod`,
`suggestedPrice`, `pricingRuleId` e o `offeredPrice` final como snapshot. Assim,
alterar uma regra não muda silenciosamente oportunidades já publicadas ou aceitas.

Valores iniciais exclusivamente provisórios: base de R$ 8,00, R$ 2,00/km e mínimo
de R$ 12,00 para Petrolina/PE e Juazeiro/BA. Revise-os no painel antes do uso real.
Não há cobrança, custódia ou repasse pela plataforma.

## Aviso jurídico interno

**MINUTA — REVISÃO JURÍDICA NECESSÁRIA ANTES DO LANÇAMENTO.**

Termos, Política, identidade do responsável, canal de contato, LGPD, motofrete local
e enquadramento tributário precisam de revisão profissional. Este repositório contém
decisões de produto e arquitetura, não parecer jurídico. O MVP não solicita CNH nem
apresenta cadastro como verificação documental.
