# Referência PostgreSQL preservada

Este diretório guarda o schema consolidado anterior à Etapa 18. As 16 migrations
PostgreSQL originais continuam, sem alteração, em `prisma/migrations` com seu
`migration_lock.toml`.

O Prisma CLI principal não usa essa árvore: `prisma.config.ts` aponta para a
baseline MySQL em `prisma/mysql/migrations`. Não execute migrations PostgreSQL
contra `provider = "mysql"` e não use esta cópia para resetar bancos.
