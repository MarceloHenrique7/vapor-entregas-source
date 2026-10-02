# Cadastro simplificado de empresas

O cadastro inicial de uma empresa pede somente nome da empresa, WhatsApp e senha
de pelo menos oito caracteres. O backend normaliza telefones brasileiros para
E.164 (`+55...`), aplica unicidade no banco, usa o hash Argon2 já existente e cria
a sessão somente depois da transação de cadastro terminar.

Depois do cadastro, a empresa é enviada diretamente para a configuração de sua
loja. O fluxo existente de endereço, autocomplete, mapa e PIN grava endereço e
coordenadas na mesma operação e atualiza a cidade operacional do perfil. A criação
da primeira entrega continua bloqueada até existir um ponto padrão válido.

## Compatibilidade

- empresas novas entram com WhatsApp e senha;
- contas antigas continuam entrando com e-mail e senha;
- o endpoint de login aceita o campo legado `email` e o novo `identifier`;
- CPF/CNPJ, e-mail e cidade não são apagados de contas existentes;
- documentos e e-mail ausentes aparecem como `Não informado` no perfil e no
  admin;
- prelaunch, RBAC, sessões, rate limiting e origin protection permanecem ativos.

Não há OTP ou recuperação automática por WhatsApp. Uma conta sem e-mail não pode
redefinir a senha apenas informando o telefone; isso exigirá uma futura prova de
posse via provedor externo. Até lá, a recuperação deve seguir um procedimento
administrativo seguro, com validação manual, sem envio de senha em texto puro.

## Migration MySQL

A migration `20260929120000_simplify_company_onboarding` apenas torna opcionais:

- `users.email`;
- `company_profiles.documentType`;
- `company_profiles.legalDocumentEncrypted`;
- `company_profiles.legalDocumentHash`;
- `company_profiles.legalDocumentLastDigits`;
- `company_profiles.city`.

Ela não remove índices, colunas ou dados históricos. Antes de liberar o código em
produção, valide a migration em um banco MySQL isolado e então execute:

```bash
npm run db:migrate:deploy
```

O build do Next.js não aplica migrations automaticamente.

## Teste manual

1. Abra `/cadastro/empresa` em 320, 360, 390 e 430 px.
2. Informe nome da empresa, WhatsApp e uma senha com oito ou mais caracteres.
3. Confirme a sessão e o redirecionamento para a localização.
4. Escolha um endereço, confira ou mova o PIN e salve.
5. Crie a primeira entrega.
6. Saia e entre novamente usando o WhatsApp em outro formato equivalente.
7. Confirme que uma conta antiga ainda entra com e-mail.
8. Verifique no admin que os campos opcionais aparecem como `Não informado`.
