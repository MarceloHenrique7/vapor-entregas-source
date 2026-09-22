# Vapor Gestão Pro

Vapor Gestão Pro é um entitlement para empresas piloto. O plano Empresa básico continua gratuito e mantém cadastro, publicação, acompanhamento, histórico, favoritos, avaliações, tracking básico (link público, localização ao vivo e compartilhamento) e VaporPay básico.

Não existe preço nem checkout do Pro nesta versão. O administrador habilita ou desabilita `CompanyProfile.proEnabled` na página de detalhes da empresa. A mudança cria uma ação `COMPANY_PRO_CHANGED` no log administrativo.

## Acesso

- Dashboard: `/app/empresa/gestao`
- Relatórios mensais: `/app/empresa/relatorios`
- Exportação CSV: `GET /api/company/pro/export`
- API de indicadores: `GET /api/company/pro/overview`

Todos os endpoints exigem sessão `COMPANY`, resolvem a empresa pelo usuário autenticado, verificam `proEnabled` e sempre filtram por `companyId`. O cliente nunca informa qual empresa consultar.

## Períodos e timezone

Filtros: hoje, 7 dias, 30 dias, mês atual, mês anterior e intervalo personalizado de até 366 dias. As fronteiras de dia usam `America/Bahia` (UTC-03:00). O limite superior é exclusivo.

## Fórmulas

- Total: entregas criadas no período.
- Concluídas/canceladas/em andamento: contagem pelos estados operacionais.
- Gasto registrado: soma de `offeredPrice` das entregas concluídas; não é extrato bancário.
- Custo médio: gasto registrado dividido pelas concluídas.
- Distância: soma de `distanceEstimateKm` das concluídas.
- Custo/km: gasto dividido pela distância quando a distância total é maior que zero.
- Taxa de conclusão: concluídas / (concluídas + canceladas).
- Motoboys utilizados: motoboys distintos vinculados no período.
- Pagamentos confirmados: concluídas com `paymentStatus = CONFIRMED`.
- Pagamentos pendentes/valor pendente: concluídas em `UNTRACKED`, `PENDING`, `REPORTED_PAID` ou `DISPUTED`.

Agregações, séries diárias, horários e ranking são calculados no MySQL/servidor. O navegador recebe apenas o resultado agregado.

## CSV

A exportação é limitada a 10.000 linhas por solicitação e inclui ID, data, bairros/cidades, motoboy, estados, valor, método, distância e timestamps. Endereços completos não são exportados. Células iniciadas por `=`, `+`, `-` ou `@` recebem neutralização contra CSV injection.

## Funcionalidades planejadas

Equipe multioperador e entregas em lote não foram ativadas neste incremento. O modelo atual associa uma conta a uma única empresa e não possui membros/convites; implementar equipe com segurança exige uma evolução própria de RBAC. Lote, oferta exclusiva à rede e personalizações Pro do tracking (logo, cores, mensagem, analytics e white-label parcial) ficam como evolução futura para não comprometer o fluxo operacional existente.

## Rollback

O código pode voltar ao commit anterior pelo pipeline Git/Hostinger. A migration é aditiva: em rollback de aplicação, as colunas e a tabela podem permanecer sem afetar o código anterior. Não remover os dados de auditoria em produção. Para desligar apenas o recurso, desabilite o entitlement das empresas piloto.
