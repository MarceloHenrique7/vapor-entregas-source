# Rotas reais, instalação PWA e destaques visuais

## Arquitetura de rotas

A distância continua encapsulada em `src/server/routing`. O provider padrão é
`straight_line`, sem chamada externa e sem custo. Quando
`DISTANCE_PROVIDER=google_routes`, o backend chama o método `computeRoutes` da
Google Routes API com `DRIVE`, solicita somente `routes.distanceMeters` e
`routes.duration` e nunca envia a chave ao navegador.

O cálculo possui timeout de 2,5 segundos por padrão. Erro HTTP, timeout,
configuração ausente ou resposta inválida usam automaticamente Haversine como
fallback, sem impedir a publicação ou exibição da oportunidade.

### Coleta até destino

- é calculada na cotação/publicação;
- requisições idênticas em andamento são deduplicadas;
- o cache em memória por coordenadas dura 24 horas;
- a entrega persiste `distanceEstimateKm`, `distanceMethod`,
  `routeDurationSeconds` e `routeCalculatedAt`;
- a cotação normalmente aquece o cache, evitando uma segunda chamada na
  publicação.

### Motoboy até coleta

- o card usa `IntersectionObserver` e só consulta a rota quando entra ou está
  próximo da área visível;
- `GET /api/routes/opportunities/[id]` exige sessão MOTOBOY, assinatura
  operacional, oportunidade disponível na mesma cidade, presença recente e
  rate limit;
- o cache usa motoboy, oportunidade e localização arredondada, com TTL padrão
  de três minutos;
- coordenadas completas não são devolvidas pelo endpoint;
- em falha, o card mantém a distância em linha reta já disponível.

O cache em memória é apenas uma otimização e funciona por processo. Em uma
implantação com várias instâncias, cada instância pode realizar uma chamada por
chave/TTL. A persistência da rota coleta-destino continua sendo compartilhada no
MySQL.

Logs de diagnóstico contêm somente provider, acerto de cache, tipo de rota,
sucesso e duração. A chave da Google não é registrada.

## Configuração

```env
DISTANCE_PROVIDER=straight_line
GOOGLE_MAPS_API_KEY=SUBSTITUA_PELA_CHAVE
GOOGLE_ROUTES_API_BASE_URL=https://routes.googleapis.com
GOOGLE_ROUTES_TIMEOUT_MS=2500
ROUTE_CACHE_TTL_SECONDS=180
```

Para habilitar em produção, ative a Routes API no Google Cloud, restrinja a
chave à API e aos endereços/ambiente do backend, cadastre as variáveis na
Hostinger e troque explicitamente `DISTANCE_PROVIDER` para `google_routes`.
Manter `straight_line` não gera chamadas faturáveis.

A migration incremental MySQL
`20260903110000_add_delivery_route_estimates` precisa ser revisada e aplicada
com `prisma migrate deploy` no processo normal de implantação. Não use
`migrate reset` nem `db push` em produção.

## Instalação PWA

O manifest já oferece modo `standalone`, escopo `/` e ícones 192, 512 e
maskable. O service worker não armazena APIs nem áreas autenticadas. O registro
agora ocorre imediatamente quando a página já terminou de carregar, evitando
perder o evento `load` durante a hidratação.

O CTA **Instalar Vapor** aparece no início do motoboy e nas configurações de
conta de Empresa e Motoboy. Ele é ocultado quando `display-mode: standalone` ou
o sinal equivalente do iOS indica instalação.

- Android/Chrome: guarda `beforeinstallprompt` somente em memória e abre o
  prompt nativo após clique explícito.
- iPhone/iPad: orienta a abrir no Safari, tocar em Compartilhar e escolher
  **Adicionar à Tela de Início**.
- outros navegadores: mostra uma orientação curta para usar o menu do
  navegador.
- `appinstalled` limpa o prompt e oculta o CTA.

O prompt nunca é aberto automaticamente.

## Hierarquia visual e acessibilidade

Botões ganham feedback discreto de hover, toque e foco. Nova oportunidade e seu
badge recebem somente dois ciclos curtos de destaque. O CTA de aceitar entrega,
ativar/renovar plano e instalar PWA recebe sombra moderada. Nomes de motoboys
clicáveis têm foco visível e realce no hover; o estado online combina texto,
badge e contraste.

As animações usam principalmente `transform`, `opacity` e sombra. A regra global
`prefers-reduced-motion: reduce` reduz animações e transições não essenciais a
uma única passagem quase instantânea. Nenhum status depende apenas de movimento.

## Verificação operacional

1. Confirme que `/manifest.webmanifest`, `/sw.js` e os três ícones respondem
   `200` por HTTPS.
2. No Chrome Android, abra Configurações e toque em **Instalar Vapor**.
3. No Safari iOS, toque no CTA e siga a instrução de Tela de Início.
4. Com `DISTANCE_PROVIDER=straight_line`, confirme o fallback sem chave.
5. Em ambiente Google autorizado, use `google_routes` e confirme distância e
   duração no card de oportunidade.
6. Verifique nos logs `scope=api.routes.estimate` sem qualquer API key.
