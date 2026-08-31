# Arquitetura inicial

## Decisão

A Vapor Entregas começa como um monólito modular em Next.js com App Router e
TypeScript estrito. A aplicação web, as rotas de backend e os jobs leves ficam no
mesmo projeto e são implantados como uma única aplicação Node.js.

Essa abordagem reduz custo operacional e complexidade no MVP. Os limites entre
domínios serão mantidos no código para permitir extração futura sem antecipar
microserviços.

## Stack prevista

- Next.js, React e TypeScript;
- Tailwind CSS para a interface;
- MySQL 8 e Prisma ORM 7.10;
- Zod nas fronteiras de entrada;
- autenticação própria baseada em sessão persistida no banco;
- Argon2id para hashes de senha;
- SSE autenticado para os eventos leves em tempo real do MVP;
- central de notificações persistente no MySQL e PWA com cache público seguro;
- OpenStreetMap + Leaflet, com geocodificação por adapter configurável;
- Vitest para testes unitários e de regras de domínio.

## Organização planejada

```text
src/
  app/                 # páginas, layouts e endpoints HTTP
  components/          # componentes visuais reutilizáveis
  features/            # módulos por domínio do produto
  lib/                 # integrações e infraestrutura compartilhada
  server/              # autorização, serviços e acesso a dados
  types/               # tipos compartilhados
prisma/                # schema, migrations e seed
public/                # ativos estáticos e PWA
docs/                  # decisões e documentação do projeto
```

Pastas futuras serão criadas somente quando tiverem código real.

## Domínios previstos

- identidade e acesso;
- perfis de motoboy e empresa;
- entregas e histórico de status;
- localização;
- avaliações, favoritos e denúncias;
- assinaturas de acesso;
- conteúdo jurídico versionado;
- administração e auditoria.

## Segurança e privacidade desde a base

- nenhum upload de documento, CNH, selfie ou foto da moto no MVP;
- CPF e RG não devem aparecer em logs nem em respostas destinadas a empresas ou
  motoboys;
- campos sensíveis serão criptografados e terão versões mascaradas específicas
  para consulta;
- autorização será validada no backend por papel e propriedade do recurso;
- secrets serão fornecidos por variáveis de ambiente e nunca versionados;
- tokens de sessão possuem 256 bits aleatórios e somente seus hashes são
  persistidos;
- a autorização efetiva consulta banco, status da conta e papel do usuário;
- bloqueio por conta e rate limit anonimizado reduzem tentativas de força bruta;
- decisões jurídicas permanecem marcadas para revisão profissional antes do
  lançamento.

## Hospedagem

A aplicação tem como alvo Node.js 22. A Hostinger informa suporte atual a Next.js
em aplicações Node.js gerenciadas nos planos Business Web Hosting e Cloud, além de
VPS. O deploy recomendado será pelo repositório Git, com `npm run build` e
`npm run start`. O plano contratado precisa oferecer aplicações Node.js; planos
sem esse recurso exigem upgrade ou VPS.

O banco de produção é MySQL, preferencialmente o recurso disponível na Hostinger,
acessado por URL de conexão protegida.

**Docker, Docker Desktop e Docker Compose não fazem parte da arquitetura do
Vapor Entregas.** O projeto não contém arquivos, scripts ou dependências desses
produtos. O Prisma acessa o MySQL exclusivamente pela variável
`DATABASE_URL`.

No desenvolvimento existem duas configurações suportadas:

1. MySQL 8 instalado diretamente no Windows e acessado em `localhost`;
2. MySQL remoto, preferencialmente já incluído na infraestrutura escolhida, acessado
   por uma `DATABASE_URL` protegida.

Nenhum provedor externo específico é obrigatório. Em produção, o banco pode ser
um recurso MySQL oferecido ou acessível pela infraestrutura da Hostinger.

## Fundação de identidade

Os únicos modelos da Etapa 2 são:

- `User`: credenciais, papel, estado e controle de bloqueio da conta;
- `Session`: sessão revogável e expirada no servidor;
- `AuthThrottle`: limitação de tentativas sem armazenar endereço de rede em texto.

Os papéis são `MOTOBOY`, `COMPANY` e `ADMIN`. O Proxy do Next.js faz somente uma
verificação otimista de cookie. Layouts protegidos, route handlers e a camada de
acesso validam a sessão persistida antes de liberar dados ou operações.

## Experiência e cadastros iniciais

A Etapa 3 adiciona um design system próprio, mobile-first, construído apenas com
React, Tailwind CSS e componentes locais. Não foi adicionada biblioteca visual
grande. Landing, login, cadastros, Termos, Privacidade e dashboards vazios usam os
mesmos tokens e componentes.

Os cadastros criam `MotoboyProfile` ou `CompanyProfile` em transação com o usuário
e os aceites jurídicos. CPF, RG e CPF/CNPJ são criptografados por AES-256-GCM;
impressões HMAC são usadas para comparação e os últimos dígitos ficam separados
somente para exibição administrativa mascarada futura. A chave vem de
`FIELD_ENCRYPTION_KEY` e nunca do código.

Rotas públicas de cadastro fixam a role no servidor. Não existe parâmetro público
capaz de criar `ADMIN`. Após autenticação, os destinos são `/app/motoboy`,
`/app/empresa` e `/admin`, com nova validação da sessão e role no servidor.

Os dashboards da Etapa 3 nasceram deliberadamente vazios. A Etapa 4 ativa somente
a configuração privada do ponto de coleta da empresa; corridas, disponibilidade,
favoritos, avaliações e pagamentos continuam inativos.

## Localização da empresa

`CompanyLocation` pertence a `CompanyProfile` em uma relação preparada para
múltiplos pontos. O MVP mantém um único ponto padrão, protegido também por índice
único por chave nullable no MySQL. O endereço deixou de ser duplicado em
`CompanyProfile`; a migration converte endereços existentes em localizações ainda
não confirmadas, sem inventar coordenadas.

As coordenadas só são gravadas após confirmação do PIN. Zod valida no backend os
limites de latitude e longitude, e a camada de serviço valida role e ownership:
uma empresa edita somente seus pontos; `ADMIN` pode atuar com empresa-alvo
explícita; `MOTOBOY` não recebe acesso. Coordenadas não são expostas em página
pública.

O mapa é renderizado por Leaflet/React-Leaflet. Tiles e geocodificação são
configuráveis por ambiente. `GeocodingProvider` desacopla o domínio do Nominatim e
permite substituir o fornecedor futuramente. O provider atual roda apenas no
servidor, adiciona identificação, timeout, cache limitado e uma fila com intervalo
entre chamadas. A interface não consulta a cada tecla: a busca é uma ação explícita
e a consulta reversa após mover o PIN usa debounce. Falhas de busca não bloqueiam
o posicionamento manual.

Os tiles e o Nominatim públicos são serviços compartilhados, sem SLA. Em maior
escala, as URLs/providers devem apontar para infraestrutura própria ou alternativa
compatível. **Docker continua fora da arquitetura**; nenhuma parte do mapa ou da
persistência depende dele.

## Presença voluntária do motoboy

A Etapa 5 adiciona ao `MotoboyProfile` apenas `isOnline`, `onlineSince`,
`lastLocationAt`, `lastLatitude` e `lastLongitude`. Coordenadas são nullable e não
existe tabela de histórico de GPS. Cada atualização substitui a última posição.
Checks no MySQL e Zod no backend garantem pares de coordenadas completos,
valores finitos, limites geográficos e precisão normalizada para seis casas.

O navegador solicita geolocalização somente após a ação **Ficar online**. Enquanto
online, `watchPosition` permanece no layout privado do motoboy e é encerrado ao
ficar offline, fazer logout ou desmontar a área autenticada. Um heartbeat moderado
de cinco minutos evita expiração quando o usuário permanece parado. Movimentos só
geram tentativa antecipada após aproximadamente 150 metros, com cooldown local e
limite mínimo adicional no backend.

Todas as rotas derivam o usuário da sessão e aceitam somente `MOTOBOY`; não existe
`userId` no payload. A resposta pública de presença contém apenas estado e horários,
nunca coordenadas. Logout marca o perfil como offline antes de revogar a sessão.

Disponibilidade efetiva exige `isOnline=true` e `lastLocationAt` dentro da janela
`ONLINE_PRESENCE_TTL_MINUTES`. Assim, fechar navegador, perder internet ou desligar
o aparelho não produz presença válida indefinidamente e não exige cron job. A
função compartilhada de Haversine calcula distância aproximada em linha reta, não
rota viária; ela está preparada para filtros futuros, mas nenhuma distribuição de
corrida foi criada.

Essa presença representa escolha livre do motoboy. Não há escala, jornada mínima,
meta, ranking por horas online ou punição por desconectar. **Docker, WebSocket e
serviços externos não fazem parte deste módulo.**

## Oportunidades e aceite atômico

`Delivery` guarda snapshots do ponto de coleta e destino para impedir que uma
edição futura do endereço altere uma oportunidade já publicada. O modelo registra
valor oferecido e método de pagamento apenas como informação; não existe carteira,
saldo, cobrança, retenção ou repasse. `DeliveryStatusHistory` registra a publicação,
o aceite e todas as transições operacionais.

A empresa nunca escolhe `companyId` ou coordenadas de coleta pelo payload. O
serviço resolve o perfil e o ponto padrão a partir da sessão. O destino passa por
Zod e checks do MySQL, e a distância Haversine é recalculada no servidor.
Oportunidades expiram após uma hora e são filtradas por cidade, presença recente e
raio aproximado de 20 km até a coleta.

O aceite exige motoboy online com localização recente e utiliza uma transação com
`UPDATE` condicional sobre `status=SEARCHING_MOTOBOY`, `motoboyId IS NULL` e prazo
válido. Somente uma atualização pode afetar a linha; tentativas concorrentes
recebem indisponibilidade sem criar dois vínculos.

O realtime da Etapa 6 usa SSE autenticado. O canal é derivado da sessão e do perfil
persistido, sem aceitar identificador de audiência do cliente. Eventos contêm
somente tipo e ID da entrega. O broker em memória atende o processo Node único do
MVP e reconecta automaticamente; múltiplas instâncias futuras exigirão um broker
compartilhado. Não foi adicionado Redis, Docker ou serviço pago.

## Fluxo operacional da entrega

A Etapa 7 mantém uma máquina de estados linear no serviço de domínio e repete a
condição esperada no `UPDATE` do MySQL. Assim, saltos, corrida alheia e dois
cliques concorrentes não alteram indevidamente o estado. Somente o motoboy vinculado
avança etapas; somente a empresa dona ou o motoboy vinculado consulta e cancela nos
intervalos permitidos.

O histórico guarda `previousStatus`, `newStatus`, `actorUserId`, `actorRole`, nota
opcional e timestamp do servidor. `pickedUpAt`, `completedAt` e `cancelledAt` também
são definidos exclusivamente pelo servidor. Coordenadas não aparecem nas respostas:
o backend transforma os pontos autorizados em links de Google Maps e Waze.

O acompanhamento reutiliza SSE autenticado e adiciona polling de 30 segundos como
contingência. Conclusão e cancelamento removem naturalmente a entrega do índice
parcial de corridas ativas, liberando o motoboy sem criar saldo, carteira ou repasse.
Cancelamentos não geram punição automática. **Docker e serviços pagos continuam
fora da arquitetura.**

## Reputação, favoritos e denúncias

`Rating` liga entrega concluída, avaliador e avaliado. O serviço carrega os
participantes e deriva a contraparte; o cliente envia apenas entrega, nota e
comentário. Constraints garantem nota de 1 a 5, pessoas diferentes e uma avaliação
por avaliador/entrega. Agregações `_avg` e `_count` evitam carregar avaliações para
calcular médias. Comentários recebidos não são expostos no MVP.

`Favorite` liga `CompanyProfile` e `MotoboyProfile` com constraint única. A listagem
calcula reputação e entregas concluídas, e reaproveita o TTL de presença para não
mostrar um status online obsoleto. Nenhuma coordenada é retornada e o favorito não
altera a distribuição de oportunidades.

`Report` é separado de avaliação e começa sempre em `OPEN`. Quando vinculado a uma
entrega, o denunciado é necessariamente a contraparte. Um fingerprint SHA-256 do
conteúdo normalizado bloqueia spam idêntico, complementado por rate limit local. A
API comum oferece somente criação e consulta das próprias denúncias; mudanças de
status ficam reservadas à moderação administrativa da Etapa 9. Texto é validado e renderizado
sem HTML. Não há punição ou bloqueio automático.

## Administração e auditoria

A área `/admin` combina proteção de rota e autorização novamente em cada endpoint.
Contas sem sessão recebem 401 nas APIs, roles operacionais recebem 403 e contas
administrativas não ativas perdem a sessão. Consultas são paginadas e usam os
índices existentes de role/status, entrega/status, denúncia/status e presença.

`AdminAction` é um registro append-only das decisões humanas de moderação. Alterar
uma conta ocorre em uma transação que atualiza o status, revoga sessões, encerra a
presença quando aplicável e cria a auditoria. Não há exclusão em cascata nem punição
automática baseada em notas, cancelamentos ou denúncias. `Report.adminNotes` guarda
observações privadas; usuários comuns não possuem rota para modificá-las.

CPF/CNPJ é localizado por HMAC/fingerprint somente em busca exata. A resposta
administrativa minimiza os dados e nunca inclui hashes de senha, sessões, tokens,
campos criptografados ou coordenadas. Docker continua explicitamente fora desta
arquitetura; o módulo usa somente MySQL/Prisma e o processo Node já existentes.

## Jurídico, privacidade e ciclo da conta

`LegalAcceptance` consolida tipo, versão, horário e metadado mínimo de origem. A
migration copia aceites históricos de Termos e Privacidade, mantendo as tabelas
legadas e todos os registros. Novos cadastros exigem checkbox não pré-marcado e o
backend continua validando os dois documentos e a declaração profissional do
motoboy.

As APIs `/api/account/*` não recebem `userId`: o escopo vem da sessão ativa. Nome,
telefone e nome fantasia são alteráveis com confirmação de senha; e-mail, documentos,
cidade e nascimento permanecem somente leitura. A senha usa Argon2id, e a troca
revoga sessões antigas antes de criar a sessão atual após `passwordChangedAt`.

A exportação descriptografa CPF/RG ou CPF/CNPJ somente para o próprio titular após
confirmação de senha. O JSON não seleciona `passwordHash`, sessões, tokens ou secrets
e minimiza dados de contraparte. O endpoint tem proteção de origem, rate limit e
resposta `no-store`.

O encerramento usa `UserStatus.DELETED`, bloqueando autenticação e autorização já
existentes. Antes, verifica entregas operacionais ou em disputa. Em transação, revoga
sessões, para presença, substitui identificadores e documentos por marcadores
protegidos, remove a última localização e anonimiza pontos editáveis da empresa.
Entregas, avaliações, denúncias, aceites e auditoria permanecem relacionados à
identidade anonimizada. `AccountClosure.retainedData` registra categorias retidas e
determina revisão contextual, sem inventar prazo legal.

`LEGAL_OPERATOR_NAME` e `LEGAL_CONTACT_EMAIL` são opcionais apenas em desenvolvimento;
sem eles, páginas e footer exibem pendência explícita. São decisões obrigatórias de
lançamento e não possuem valores fictícios no código. Docker, serviços pagos,
pagamento, carteira, CNH e upload continuam fora da arquitetura.

## Pendências deliberadas

- definir provider de geocodificação de produção caso o volume ultrapasse o uso
  moderado permitido pelo endpoint público;
- reavaliar um broker compartilhado ou WebSocket somente se escala e fluxo
  bidirecional futuro realmente exigirem;
- preencher a identidade jurídica responsável e o canal real de contato;
- revisar Termos, Privacidade, política de retenção, motofrete local, LGPD e
  enquadramento tributário com profissionais antes do lançamento.

> MINUTA — REVISÃO JURÍDICA NECESSÁRIA ANTES DO LANÇAMENTO.

## Consolidação da Etapa 11

`Notification` pertence diretamente ao `User`, possui índice composto por titular,
leitura e criação e armazena somente mensagem e metadados mínimos. IDs de entrega ou
denúncia podem orientar a interface, mas nenhum documento, coordenada, token ou
credencial integra o payload. Listagem e mutações derivam `userId` da sessão e usam
paginação/ownership no MySQL.

SSE continua sendo o canal rápido para alterações de corrida no processo único. O
cliente usa polling de 30 segundos somente quando o canal fica indisponível. A
central persistente é o registro durável e funciona independentemente de SSE ou de
Web Push. O service worker contém o receptor de push, porém subscriptions e envio
VAPID não fazem parte deste MVP.

O service worker usa uma allowlist de shell público e assets. APIs, páginas privadas,
administração, login e cadastros são excluídos antes de qualquer decisão de cache.
`Cache-Control: private/no-store` e `Set-Cookie` também impedem armazenamento. Isso
prioriza isolamento de sessão sobre uma experiência totalmente offline.

Headers de produção incluem CSP compatível com os tiles atuais do OpenStreetMap,
proteção contra framing, `nosniff`, política de referência e restrição de câmera e
microfone. HSTS deve ser habilitado no proxy somente depois de domínio e HTTPS
estarem validados. Docker permanece fora da arquitetura.

## Histórico empresarial — Etapa 12

O módulo `company-history` isola consultas analíticas leves do serviço operacional
de entregas. Todas as consultas começam pelo `userId` da sessão `COMPANY`, resolvem
o `CompanyProfile` correspondente e aplicam `companyId` no `where` do Prisma. Isso
evita IDOR inclusive em detalhe, relacionamento e repetição de entrega.

Listagens usam paginação server-side e selects mínimos. Os índices compostos
`(companyId, status, createdAt)` e `(companyId, motoboyId, createdAt)` atendem os
filtros e relacionamentos mais frequentes. Reputação é agregada com `groupBy`, sem
N+1 por motoboy. O status online exposto à empresa passa pelo mesmo TTL de presença
e nunca inclui latitude/longitude.

A repetição é somente leitura da entrega original: o servidor retorna um conjunto
permitido para preencher o formulário, que ainda exige confirmação humana e usa o
ponto de coleta padrão atual. Não há cópia de documentos, contatos, dados de sessão
ou publicação automática. MySQL e Prisma continuam sendo toda a infraestrutura
necessária; Docker e serviços pagos permanecem fora da arquitetura.

## Regras operacionais e adicionais — Etapa 13

`DeliveryExtra` preserva a declaração original de uma condição sem modificar
`Delivery.offeredPrice`. Tipo, descrição, valor opcional, autor, role, estado e
horário são persistidos. `DeliveryExtraHistory` é append-only para criação, ciência,
rejeição ou cancelamento, permitindo incorporar esses eventos à timeline sem
inventar transições do enum operacional da entrega.

Adicionais conhecidos são criados na mesma transação da oportunidade. Se houver
adicional `PENDING`, o aceite atômico exige `extrasAcknowledged=true`; a confirmação
e o vínculo do motoboy ocorrem na mesma transação. Condições surgidas depois do
aceite somente podem ser incluídas por participantes durante estados operacionais,
e apenas a contraparte pode responder. O backend deriva usuário e role da sessão e
valida ownership novamente no MySQL.

Valores são `Decimal(10,2)`, não negativos, opcionais e estritamente informativos.
Não há soma automática ao preço, carteira, cobrança ou repasse. Textos têm limites,
rejeitam marcação HTML e continuam sendo renderizados como texto não confiável pelo
React. Índices por entrega/estado/data e ator/data atendem timeline e auditoria.
Alterações são sinalizadas pelo SSE existente, sem serviço externo.

Esta modelagem descreve o funcionamento operacional pretendido, mas não constitui
parecer jurídico e deve ser revisada profissionalmente antes da produção.

## Distância e precificação configurável — Etapa 14

`DistanceProvider` isola o mecanismo de estimativa do domínio de entregas. A
implementação inicial `StraightLineDistanceProvider` usa Haversine localmente, sem
rede, chave ou serviço pago, e sempre retorna `STRAIGHT_LINE`. A API e a interface
rotulam o resultado como linha reta para não sugerir uma distância viária que não
foi calculada. A configuração `DISTANCE_PROVIDER` permite introduzir outro adapter
futuramente.

`PricingRule` é versionada por cidade e período. A cotação usa a regra ativa no
horário do servidor e calcula `max(minimumPrice, basePrice + pricePerKm × km)`, com
arredondamento monetário a centavos. A criação recalcula a mesma cotação no backend
e persiste na entrega a distância, o método, o preço sugerido e a regra usada. O
preço final oferecido permanece um campo separado e não é recalculado depois da
publicação.

A troca administrativa encerra regras ativas da cidade e cria uma versão nova em
uma transação junto ao `AdminAction`. APIs de cotação exigem COMPANY; leitura e
alteração de regras exigem ADMIN ativo. Ambas usam sessão do servidor, validação
Zod, origem válida nas mutações e rate limit. A agregação da avaliação da empresa
nas oportunidades é feita em lote para evitar N+1. MySQL e Prisma continuam
sendo a única infraestrutura persistente; Docker e serviços pagos não fazem parte
desta etapa.

## Assinaturas da plataforma — Etapa 15

`SubscriptionPlan` representa a oferta mensal por role. `Subscription` registra um
snapshot do preço contratado, estado local, identificador opaco do provider e
datas do ciclo. `SubscriptionEvent` é append-only e possui identificador de evento
único para tornar a recepção repetida do webhook idempotente. Um índice parcial no
Uma chave nullable única no MySQL permite no máximo uma assinatura aberta por usuário.

`SubscriptionProviderClient` mantém o domínio independente do fornecedor. O
adapter atual usa a API de assinaturas do Mercado Pago somente no servidor: cria
uma preapproval pendente, entrega ao navegador apenas o checkout hospedado e nunca
recebe cartão ou CVV. Cancelamento usa o estado oficial `canceled`; sincronização e
webhook sempre consultam o recurso autenticado antes de atualizar o banco. A
assinatura HMAC do webhook é validada com comparação constante e o ambiente
TEST/produção também é conferido.

Somente `TRIAL` ainda vigente ou `ACTIVE` libera novas operações. A checagem fica
nas fronteiras server-side de publicação, disponibilidade, atualização de presença
e aceite. A listagem pode orientar a decisão de assinatura, mas não autoriza o
aceite. A checagem não foi inserida nas transições de uma corrida já vinculada,
nem em histórico, conta ou páginas jurídicas, evitando interromper uma operação em
andamento. `PAST_DUE`, `CANCELED` e `EXPIRED` não são tratados como pagamento ativo.
O pagamento informativo da entrega continua totalmente separado da mensalidade.

Planos são administrados por API exclusiva de `ADMIN`, com Zod, validação de origem,
rate limit e `AdminAction`. Nenhum segredo ou identificador de assinatura é exposto
na página pública. Docker não integra este fluxo; a persistência continua em
MySQL e a chamada externa é restrita ao provider configurado.

## Consolidação e QA — Etapa 16

A matriz final combina testes unitários, integração real com MySQL, smoke HTTP
autenticado e auditoria manual documentada. O aceite concorrente permanece atômico
por `UPDATE` condicional dentro de transação. Fixtures usam IDs próprios e são
removidos seletivamente, sem reset ou exclusão dos dados do ambiente.

O deploy-alvo é um processo Node.js 22 persistente atrás de HTTPS, conectado a
MySQL. SSE em memória exige uma única instância nesta versão; uma escala
horizontal futura precisará de broker compartilhado, sem alterar o domínio. PWA e
cache continuam excluindo APIs, áreas privadas, administração e respostas com
sessão. Tiles OpenStreetMap/Nominatim permanecem serviços de melhor esforço e Web
Push continua uma extensão opcional, não requisito do MVP.

## Marca e pré-lançamento

A marca pública é **Vapor Entregas**. Nome, metadata, textos jurídicos, manifest,
PWA e comunicações visíveis usam essa identidade. O cookie histórico
`entregavale_session` foi deliberadamente preservado para não encerrar sessões já
emitidas. Eventos de logout e a autorização temporária de rastreamento escrevem no
namespace `vapor-entregas:` e mantêm leitura/dispatch do prefixo legado
`entregavale:` durante a transição. Esses identificadores não aparecem como marca
para o usuário; a remoção da compatibilidade deve ocorrer somente após a expiração
das sessões e versões de frontend anteriores.

`PRELAUNCH_MODE` é um gate server-side `default deny` no Proxy. A allowlist usa
igualdade exata de pathname e método: `/`, `/form`, `/admin/acesso`, `/acesso/teste`,
Termos, Privacidade, manifest, robots, service worker, favicon, quatro ícones e os
POSTs de pré-cadastro/login administrativo/login de homologação. Somente os assets
internos `/_next/static` e `/_next/image` ficam fora do matcher. Login e cadastro
comuns, logout, webhook e toda API operacional são bloqueados por padrão.

Para qualquer rota não pública, a sessão é validada no MySQL; somente `ADMIN`
ativo ou UUID em `PRELAUNCH_TEST_USER_IDS` passa. O endpoint administrativo só cria
sessão para role `ADMIN`; o endpoint de homologação só cria sessão para UUID listado.
O gate não concede role: layouts, route handlers, ownership e RBAC continuam
repetindo a autorização normal. Visitantes recebem redirect para `/` nas páginas e
401 nas APIs; usuários com sessão não autorizada recebem 403 nas APIs.

`PreRegistration` é independente de `User` e pode ser associado futuramente por
`convertedUserId`. A constraint `(normalizedPhone, type)` torna o cadastro
idempotente sem expor se outro tipo de conta existe. Nome e telefone são privados,
ficam fora de logs comuns e só aparecem na área administrativa. A API pública aceita
apenas POST, limita corpo a 2 KiB, valida origem, Zod e rate limit anonimizado. O
painel usa paginação server-side e envia busca por corpo, evitando PII na URL.

Desativar o modo exige apenas `PRELAUNCH_MODE=false` e reinício da aplicação. Nenhuma
migration reversa, exclusão de lead ou mudança na autenticação é necessária.

## MySQL e Hostinger — Etapa 18

O datasource principal passou a MySQL 8 com `@prisma/adapter-mariadb`. UUIDs são
`CHAR(36)`, timestamps são `DATETIME(3)`, JSONB virou JSON e buscas usam a collation
`utf8mb4_unicode_ci`. O PostgreSQL anterior permanece intacto e suas 16 migrations
continuam arquivadas; a baseline MySQL consolidada vive em
`prisma/mysql/migrations`.

Índices parciais foram substituídos por chaves nullable únicas atualizadas na mesma
transação das alterações de default/status. O aceite continua usando `updateMany`
condicional e foi validado em MySQL real com dois motoboys concorrentes. O schema,
checks e relações exigem MySQL 8.0.16+.

O processo continua sem Docker e usa apenas `DATABASE_URL`. Estratégia, rollback e
procedimento Hostinger estão em `docs/mysql-migration.md` e
`docs/hostinger-mysql-deploy.md`.
