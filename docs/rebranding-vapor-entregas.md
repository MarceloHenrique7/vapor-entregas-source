# Rebranding para Vapor Entregas

## Escopo e inventário

A auditoria anterior às alterações encontrou 135 linhas com referências de marca
antiga. As variantes presentes eram `Movvi`, `Movvi Entregas`, `movvi-entregas`,
`movvi_entregas`, `MovviEntregas`, `EntregaVale` e `entregavale`. Não foram
encontradas referências a essas marcas no schema Prisma, em migrations MySQL, em
queries funcionais ou em valores persistidos de configuração. Por isso, o
rebranding não exige migration de dados.

As ocorrências foram classificadas em:

- marca pública: textos, metadata, documentos jurídicos, comunicações, nomes de
  planos no Mercado Pago, PWA e arquivos exportados;
- identidade visual: tokens, ilustrações, logo, ícones e cor do navegador;
- identificadores técnicos seguros: package, cache do service worker, variáveis
  globais em memória e nomes de banco apenas exemplificativos;
- compatibilidade histórica: cookie de sessão e namespaces temporários no
  navegador.

## Identidade aplicada

O nome oficial é **Vapor Entregas**, com **Vapor** como nome curto. A paleta central
fica em `src/app/globals.css`:

- principal `#EA1D2C`;
- hover `#D71928`;
- escuro `#B91522`;
- claro `#FDE7E9`;
- suave `#FFF3F4`;
- destaque `#FF4D5A`;
- texto `#1F1F1F` e secundário `#5F6368`;
- canvas `#F7F7F7`, superfície `#FFFFFF` e borda `#E6E6E6`.

Verde continua reservado a estados funcionais de sucesso ou disponibilidade, e
amarelo continua representando avaliações e destaques semânticos. O símbolo da
logo manteve geometria e proporções; somente a identidade cromática e o texto foram
atualizados.

## Assets, PWA e cache

Os assets públicos agora usam `vapor-entregas-icon.svg`,
`vapor-entregas-192.png`, `vapor-entregas-512.png` e
`vapor-entregas-maskable-512.png`. Manifest, metadata, Apple touch icon, service
worker e allowlist do pré-lançamento apontam para os novos caminhos. O cache público
foi elevado para `vapor-entregas-static-v4`, fazendo versões anteriores descartarem
o shell visual antigo na ativação do novo service worker.

## Compatibilidade preservada

Referências históricas permanecem deliberadamente nos seguintes pontos:

- `src/server/auth/session-constants.ts`: o cookie `entregavale_session` não foi
  renomeado para evitar logout global e quebra de sessões já emitidas;
- `src/components/presence/motoboy-presence-provider.tsx`,
  `src/components/dashboard/dashboard-shell.tsx` e
  `src/components/account/account-settings.tsx`: eventos e a chave temporária
  legados são lidos/removidos ou enviados em paralelo ao namespace novo para
  compatibilidade entre abas e bundles durante a transição.
- `src/app/branding.test.ts`: a expressão de regressão enumera os nomes antigos
  somente para impedir que voltem a aparecer em superfícies públicas;
- este documento e `docs/architecture.md`: os nomes técnicos anteriores aparecem
  apenas no inventário histórico e na justificativa de compatibilidade.

Esses valores não são exibidos ao usuário. A remoção pode ocorrer após expirar as
sessões antigas e não haver mais clientes executando bundles anteriores.

## Operação

O `.env` real não foi alterado. Em cada ambiente, ajuste manualmente valores
comerciais como `NEXT_PUBLIC_APP_NAME`, `ADMIN_NAME` e
`GEOCODING_USER_AGENT` conforme os placeholders atuais de `.env.example`. O domínio,
endereços de e-mail e dados jurídicos não foram inventados nem renomeados.

O rebranding não modifica RBAC, autenticação, regras de assinatura, IDs do Mercado
Pago, referências externas, schema Prisma, migrations, dados de entregas ou o gate
de `PRELAUNCH_MODE`.
