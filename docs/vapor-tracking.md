# Vapor Tracking

## Arquitetura

O tracking reutiliza os estados de entrega, autenticação/RBAC, mapas OpenStreetMap/Leaflet e geolocalização do navegador já existentes. Ele não cria servidor WebSocket paralelo. O fluxo é:

`GPS do motoboy -> API autenticada Vapor -> última posição da entrega -> API pública por token -> mapa do cliente`.

A empresa ativa um único link por entrega. O token tem 256 bits aleatórios, formato Base64URL, não contém IDs e nunca usa `Math.random`. O banco guarda o SHA-256 para busca e uma cópia cifrada com `FIELD_ENCRYPTION_KEY` apenas para a empresa dona recuperar o mesmo link. Revogar ou regenerar invalida o token anterior.

## Ciclo de vida

- `ACCEPTED`, `MOTOBOY_TO_PICKUP`, `ARRIVED_AT_PICKUP` e `PICKED_UP`: o link pode existir, mas não expõe localização.
- `IN_DELIVERY`: o motoboy vinculado pode enviar GPS e o cliente vê a última posição.
- `COMPLETED`, `CANCELLED_BY_COMPANY` ou `CANCELLED_BY_MOTOBOY`: o navegador interrompe o `watchPosition`, a API recusa novas posições e a API pública deixa de retornar coordenadas.
- O link expira pelo menor prazo entre `TRACKING_LINK_TTL_HOURS` e a janela terminal `TRACKING_TERMINAL_TTL_HOURS` contada da conclusão/cancelamento.
- Troca de motoboy preserva o link; somente o motoboy atualmente vinculado passa na verificação de ownership.

## GPS e frequência

O componente da corrida usa `navigator.geolocation.watchPosition` com alta precisão e um heartbeat moderado. Uma leitura é enviada quando houver movimento relevante ou quando o heartbeat vencer, sempre respeitando o throttle do navegador, o rate limit da API e o intervalo atômico no MySQL. O payload contém latitude, longitude, precisão e horário da captura. O servidor valida faixas, recência, role, ownership, estado e link ativo.

Somente a última posição é armazenada em `delivery_tracking`; cada atualização substitui a anterior. Não há tabela de percurso nem retenção infinita.

Browsers e sistemas móveis podem suspender JavaScript/GPS em segundo plano. A interface informa: mantenha a Vapor aberta durante a entrega. O produto não promete tracking contínuo quando o sistema operacional interrompe o navegador.

## Atualização da página pública

Foi escolhido polling de 10 segundos, compatível com a hospedagem Node da Hostinger e sem infraestrutura adicional. A página atualiza sem refresh e distingue:

- aguardando início/localização;
- posição recente;
- posição desatualizada (`STALE`);
- concluída;
- cancelada;
- link expirado/indisponível.

Nenhum ETA é inventado. O mapa mostra o motoboy e o destino somente durante `IN_DELIVERY`.

## Endpoints

- `GET /api/deliveries/{id}/tracking`: status interno para empresa ou motoboy participante.
- `POST /api/deliveries/{id}/tracking`: cria/recupera link, somente empresa dona.
- `DELETE /api/deliveries/{id}/tracking`: revoga, somente empresa dona.
- `POST /api/deliveries/{id}/tracking/location`: atualiza GPS, somente motoboy atual em `IN_DELIVERY`.
- `GET /api/tracking/{token}`: resposta pública mínima, somente leitura.
- `GET /r/{token}`: página pública mobile-first, sem login.

Todas as respostas usam `no-store`. A rota pública envia `X-Robots-Tag`, define `noindex/nofollow/noarchive`, está fora do sitemap e bloqueada no `robots.txt`.

## Compartilhamento

Na entrega da empresa estão disponíveis abrir acompanhamento, copiar, Web Share API quando suportada e WhatsApp. A mensagem não contém PII. O tracking básico integra o plano gratuito da empresa; personalização visual e analytics são futuras possibilidades Pro.

## Privacidade e segurança

- Sem telefone, e-mail, documentos, pagamento, IDs internos ou endereço completo na API pública.
- Sem coordenadas nos logs comuns.
- Sem Meta Pixel nas páginas `/r/{token}`.
- Token forte, hash único, expiração, revogação e regeneração.
- Proteção de origem nas mutações, sessão, RBAC, ownership, Zod e rate limit.
- Posição oculta antes de `IN_DELIVERY` e após estados terminais.

## Variáveis

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.example
TRACKING_LINK_TTL_HOURS=72
TRACKING_TERMINAL_TTL_HOURS=24
TRACKING_LOCATION_MIN_INTERVAL_SECONDS=10
TRACKING_LOCATION_STALE_SECONDS=60
```

`FIELD_ENCRYPTION_KEY` já é obrigatória para campos protegidos e também cifra o token recuperável. Não troque essa chave sem um plano de rotação.

## Troubleshooting

- **Aguardando empresa:** ative o link no detalhe da entrega.
- **Permissão negada:** permita localização para o domínio no navegador e use “Solicitar localização novamente”.
- **Sem sinal/stale:** confira GPS, conexão e mantenha a Vapor aberta.
- **409 no GPS:** a entrega não está em `IN_DELIVERY`, o link não está ativo ou a leitura está antiga.
- **429:** aguarde o `Retry-After`; não aumente frequência do polling/GPS.
- **410 público:** o link expirou; durante entrega elegível a empresa pode gerar outro.

## Migration e rollback

A migration `20260917190000_add_delivery_tracking` é aditiva e cria apenas `delivery_tracking`. O rollback da aplicação pode manter a tabela sem afetar versões anteriores. Para rollback estrutural planejado, primeiro desative o recurso e depois remova a FK/tabela em manutenção específica; nunca execute `migrate reset` em produção.
