# QA final do MVP — Etapas 16 e 17

Este documento é a matriz reproduzível de homologação da Vapor Entregas. Marque um
item como aprovado somente depois de executá-lo no ambiente indicado. Não use
`prisma migrate reset` nem credenciais de produção durante testes.

## Automação local

Na raiz do projeto, com MySQL disponível:

```powershell
npm ci
npx prisma validate
npx prisma generate
npm run db:migrate:deploy
npm run lint
npm run typecheck
npm run format:check
npm test
$env:RUN_DB_INTEGRATION='1'
npx vitest run src/server/stage11-flow.integration.test.ts
Remove-Item Env:RUN_DB_INTEGRATION
npm run build
```

Para o smoke HTTP, mantenha `npm run dev` ativo em outro terminal:

```powershell
$env:RUN_API_INTEGRATION='1'
npx vitest run src/server/stage11-api.integration.test.ts
Remove-Item Env:RUN_API_INTEGRATION
```

O fluxo de banco cria empresa, dois motoboys e uma entrega efêmeros. Os dois
motoboys aceitam simultaneamente e o teste exige exatamente um vencedor. Também
valida salto de status, IDOR, adicionais, conclusão, avaliação duplicada, favorito,
denúncia, histórico, cancelamento, assinatura exigida e continuidade de corrida
aceita depois da expiração da mensalidade.

## Empresa

- cadastro exige Termos e Privacidade e nunca aceita role do cliente;
- login direciona a `/app/empresa`;
- localização permite busca, clique/arraste do PIN e persistência do ponto padrão;
- cotação identifica distância em linha reta e permite confirmação do valor;
- publicação exige assinatura válida, ponto padrão e dados válidos;
- entrega aceita atualiza por SSE ou polling de contingência;
- timeline, adicionais, cancelamento permitido e conclusão aparecem sem refresh
  manual excessivo;
- histórico, repetição como rascunho, avaliação, favorito e denúncia respeitam
  ownership;
- exportação e encerramento exigem senha e não expõem segredos.

## Motoboy

- cadastro exige declaração profissional e não solicita CNH ou upload;
- login direciona a `/app/motoboy`;
- **Ficar online** exige assinatura e gesto explícito antes da permissão de GPS;
- negar permissão não ativa a presença; **Ficar offline** encerra `watchPosition`;
- oportunidade mostra somente dados necessários, valor informativo e distância em
  linha reta;
- aceite é livre e exige confirmação dos adicionais pendentes;
- corrida segue `ACCEPTED → MOTOBOY_TO_PICKUP → ARRIVED_AT_PICKUP → PICKED_UP →
IN_DELIVERY → COMPLETED`, sem saltos;
- corrida já aceita pode terminar mesmo se a assinatura deixar de estar válida;
- histórico, avaliação e denúncia continuam acessíveis sem assinatura ativa.

## Administração

- `/admin` e `/api/admin/*` retornam acesso somente para `ADMIN` ativo;
- usuários, entregas e denúncias são paginados e filtrados no servidor;
- suspensão/banimento revoga sessões e bloqueia operações sem apagar histórico;
- auditoria é somente leitura;
- precificação cria versão nova sem alterar snapshots de entregas antigas;
- assinaturas permitem editar plano, preço, trial e visibilidade, gerando auditoria;
- respostas nunca incluem senha, hashes de sessão, tokens, secrets ou coordenadas
  privadas.

## Pagamento de acesso em sandbox

Esta seção requer credenciais TEST e uma URL HTTPS acessível ao Mercado Pago.

1. configure `MERCADO_PAGO_MODE`, `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`, Access
   Token, segredo de webhook, API base e `NEXT_PUBLIC_APP_URL` sem substituir
   outras chaves do ambiente;
2. cadastre `/api/webhooks/mercadopago` e o tópico `payment` no painel do
   provider;
3. abra a compra de acesso como empresa e motoboy e confirme que o Payment Brick
   oficial oferece somente Pix e cartão de crédito;
   no campo de e-mail, use um endereço comum diferente da conta vendedora e não
   use um endereço terminado em `@testuser.com`;
4. conclua pagamentos de teste pelos dois meios e confirme `ACTIVE` somente
   depois de a API do Mercado Pago retornar `approved`;
5. envie novamente o mesmo evento e confirme resposta de duplicidade sem novo
   `SubscriptionEvent`;
6. confirme que Pix apenas gerado fica `PENDING` e não libera acesso;
7. confirme que cada aprovação acrescenta 30 dias e que pagamento recusado não
   remove um período de acesso ainda válido;
8. verifique que access token, cartão e CVV não aparecem em HTML, logs ou banco.

## Mobile, PWA e acessibilidade

Execute em Android Chrome e iPhone Safari reais antes do lançamento. Em cada
dispositivo, verifique também 320 px, 375 px, 768 px e desktop:

- instalação PWA, ícones, modo standalone e atualização do service worker;
- login, menus, bottom navigation e áreas seguras do aparelho;
- botões operacionais com alvo confortável e sem ação dependente de hover;
- teclado não cobre confirmação de formulários;
- PIN do mapa permanece arrastável e a atribuição OpenStreetMap está visível;
- geolocalização é solicitada apenas por gesto, funciona em HTTPS e para ao ficar
  offline;
- cards, timeline, adicionais, valores, notificações e diálogos não cortam texto;
- foco visível, labels, mensagens de erro e contraste são compreensíveis;
- shell público pode usar cache; páginas privadas e APIs nunca reaparecem offline.

## Segurança e privacidade

- testar 401, 403, 404 e 409 sem trocar tudo por erro genérico;
- mutações de cookie exigem origem válida, exceto webhook autenticado por HMAC;
- IDs enviados passam por Zod e cada serviço repete role/ownership;
- dois cliques e duas aceitações concorrentes não duplicam efeitos;
- CPF, RG, telefone, e-mail, coordenadas, tokens e secrets não aparecem em URLs,
  logs comuns, PWA cache ou respostas sem necessidade;
- localização do motoboy guarda somente último ponto e TTL, sem trilha GPS;
- CSP permite apenas origens necessárias para o mapa e não usa `unsafe-eval` em
  produção; o modo development recebe a exceção estritamente necessária ao React;
- `npm audit --omit=dev` deve ser revisado sem atualização major automática.

## Gate de produção

Não liberar comercialmente enquanto faltar: identidade jurídica e contato reais,
revisão profissional dos textos jurídicos/LGPD/motofrete, credenciais e webhook de
produção homologados, artes definitivas dos ícones PWA, teste em aparelhos físicos,
política operacional de backup/restore, monitoramento, limites sustentáveis de
OpenStreetMap/Nominatim e confirmação do plano Node/MySQL da hospedagem.

## Pré-lançamento

- com `PRELAUNCH_MODE=false`, executar novamente os fluxos das Etapas 1–16;
- com `PRELAUNCH_MODE=true`, confirmar landing, SEO, formulário, sucesso e deduplicação;
- confirmar bloqueio de login/cadastro/app/admin para visitante e conta comum;
- repetir tentativas com query string e acesso direto a APIs privadas;
- confirmar `/admin/acesso` somente para ADMIN e `/acesso/teste` somente para ID de
  teste ativo;
- confirmar que o ID de teste não ganha permissões de outra role;
- consultar métricas, filtros, paginação e CSV em `/admin/pre-cadastros`;
- validar a landing em 320 px, 375 px, tablet e desktop em aparelhos/navegadores reais;
- confirmar nome e short name da PWA como Vapor Entregas / Vapor;
- revisar WhatsApp coletado como dado privado e nunca presente em URL ou log comum.
