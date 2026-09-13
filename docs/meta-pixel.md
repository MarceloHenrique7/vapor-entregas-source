# Meta Pixel na Vapor Entregas

## Arquitetura

O Pixel é inicializado uma única vez pelo componente global `MetaPixel`. O
componente acompanha mudanças reais de pathname do App Router e envia um
`PageView` por rota, sem usar polling ou observar o DOM. As funções de analytics
ficam centralizadas em `src/lib/analytics/meta-pixel.ts` e falham silenciosamente
quando a integração está desabilitada ou sem Pixel ID.

Eventos de conversão são disparados somente no navegador e após sucesso real da
API. Nenhum nome, telefone, e-mail, CPF, CNPJ, endereço ou outro dado pessoal é
enviado ao Meta.

## Variáveis de ambiente

```env
NEXT_PUBLIC_META_PIXEL_ID=
NEXT_PUBLIC_META_PIXEL_ENABLED=false
```

Obtenha o ID em **Meta Events Manager > Fontes de dados > Pixel**. Como as duas
variáveis usam o prefixo `NEXT_PUBLIC_`, seus valores são incorporados durante o
build. Na Hostinger, configure-as antes de iniciar uma nova implantação.

O site continua funcionando se o ID estiver ausente. Em desenvolvimento e
localhost, mantenha `NEXT_PUBLIC_META_PIXEL_ENABLED=false` para não contaminar os
dados. Para um teste deliberado, use um Pixel de teste e habilite explicitamente
a variável.

## Eventos implementados

- `PageView`: carregamento inicial e cada mudança real de pathname.
- `Lead`: após a API confirmar a criação de um novo pré-cadastro, com
  `lead_type=company|motoboy` e `source=prelaunch_form`.
- `CompleteRegistration`: após a API confirmar o cadastro definitivo, com
  `registration_type=company|motoboy` e `platform=vapor`.
- `CompanyRegistrationCompleted`: evento customizado adicional após cadastro
  definitivo de empresa.

Respostas de pré-cadastro com status `existing`, erros HTTP, erros de validação e
cliques nos botões não geram conversão. Uma chave opaca no `sessionStorage`
impede a repetição do mesmo evento de sucesso na mesma sessão. O identificador
usado localmente para deduplicação não é enviado ao Meta.

Não existe atualmente um botão de WhatsApp comercial no site, portanto o evento
`Contact` não foi inventado. O código aceita futuramente um `eventId`, permitindo
adicionar a Conversions API e deduplicação navegador/servidor sem espalhar chamadas
diretas a `fbq` pela aplicação.

## Consentimento e LGPD

O projeto ainda não possui um gerenciador de consentimento de marketing. A flag
de ambiente permite manter o Pixel totalmente desligado, mas não substitui o
consentimento individual. Antes de habilitá-lo para visitantes em produção,
implemente uma escolha de cookies/marketing adequada à política de privacidade e
condicione `isMetaPixelEnabled()` a essa autorização. Advanced Matching não foi
ativado.

## Validação

1. Faça uma implantação com um Pixel de teste e a flag habilitada.
2. Abra o DevTools e confirme uma única requisição a `fbevents.js`.
3. Use o Meta Pixel Helper e navegue entre rotas; deve aparecer um `PageView` por
   pathname.
4. Envie um pré-cadastro inválido: nenhum `Lead` deve aparecer.
5. Crie pré-cadastros válidos de empresa e motoboy e confira os parâmetros em
   **Test Events** no Events Manager.
6. Faça cadastros definitivos válidos e confira `CompleteRegistration`; para a
   empresa, confira também `CompanyRegistrationCompleted`.
7. Repita uma submissão ou recarregue a tela: não deve surgir nova conversão sem
   uma nova criação confirmada.
8. Remova o Pixel ID ou desabilite a flag e confirme que o site continua normal,
   sem carregar recursos do Meta.

## Conversão recomendada para campanhas de empresas

No Events Manager, crie uma conversão personalizada chamada
**Vapor - Cadastro de Empresa Concluído** baseada no evento customizado
`CompanyRegistrationCompleted`. Use a categoria de cadastro concluído ou lead,
conforme as opções exibidas pela conta. Como alternativa, se a interface permitir
filtrar parâmetros, use `CompleteRegistration` com
`registration_type = company`.

Otimize a campanha para essa conversão, não para `PageView` ou clique. A ativação
do Pixel, domínio verificado, priorização de eventos e criação da conversão são
configurações externas que precisam ser concluídas no Meta Business.
