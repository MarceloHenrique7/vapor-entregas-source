import "dotenv/config";

import { defineConfig } from "prisma/config";

const buildOnlyDatabaseUrl = "mysql://build:build@127.0.0.1:3306/vapor_build";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/mysql/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` não acessa o banco e precisa funcionar no postinstall.
    // Comandos que acessam dados ainda falharão sem uma DATABASE_URL real.
    url: process.env.DATABASE_URL ?? buildOnlyDatabaseUrl,
  },
});
