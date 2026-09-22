# Cadastro completo no pré-lançamento

## Fluxo

1. A landing registra nome, WhatsApp e o perfil escolhido em `PreRegistration`.
2. O navegador conserva temporariamente esse rascunho em `sessionStorage` e segue
   para `/cadastro/empresa` ou `/cadastro/motoboy`. Nenhum dado pessoal é colocado
   na URL.
3. A pessoa completa os dados, aceita os documentos e cria a própria senha.
4. O backend valida o payload, fixa a role permitida, protege documentos sensíveis,
   cria a sessão e relaciona o pré-cadastro ao usuário por `convertedUserId`.
5. Durante o pré-lançamento, a conta acessa apenas `/cadastro/concluido`, suas
   configurações e, para empresas, a configuração de localização.

O registro original do interesse é preservado. No painel administrativo ele aparece
como `Interessado` ou `Conta criada`.

## Segurança

- cadastro e login possuem validação de origem e limitação de tentativas;
- roles são definidas no servidor e os schemas rejeitam campos extras;
- senha, documentos e dados do rascunho não entram em URLs nem eventos analíticos;
- o gate continua em modo default-deny para entregas, oportunidades, presença,
  pagamentos e assinaturas;
- `PRELAUNCH_TEST_USER_IDS` continua exclusivo para homologação ampla por UUID.

## Comunicação por e-mail

O repositório ainda não possui provedor transacional de e-mail configurado. Por
isso, esta entrega não envia confirmação automática e não inventa SMTP ou segredo.
Essa integração permanece pendente até a escolha de um provedor, templates e regras
de consentimento. A senha escolhida pelo usuário nunca deve constar em e-mail.

## Data de lançamento

A data exibida publicamente é centralizada em `src/config/prelaunch.ts`. Alterações
exigem novo build porque também afetam metadados gerados pela aplicação.
