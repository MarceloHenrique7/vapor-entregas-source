# Visibilidade das avaliações

## Regra atual

Não foi encontrada promessa de anonimato no fluxo ou nos termos existentes. O texto anterior informava que os comentários não eram públicos. A nova interface mantém essa regra: a avaliação não é pública para terceiros.

O usuário avaliado pode ver nome público de quem avaliou, nota, comentário, data e referência reduzida da entrega. Para empresas, o nome público é o nome fantasia quando disponível. Nunca são exibidos telefone, e-mail, CPF/CNPJ, endereço ou outros dados privados.

## Autorização

`GET /api/ratings` deriva o usuário exclusivamente da sessão. Não aceita `userId` arbitrário. O repositório filtra avaliações por `reviewedUserId` igual ao usuário autenticado, evitando IDOR.

Admins continuam vendo avaliações vinculadas às entregas somente na área protegida de moderação.
