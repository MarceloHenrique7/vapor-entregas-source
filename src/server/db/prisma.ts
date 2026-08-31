import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseEnv } from "@/server/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const { DATABASE_URL } = getDatabaseEnv();
  const adapter = new PrismaMariaDb(DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  // O adapter gerencia um pool de conexões. Reutilizar o client é obrigatório
  // também em produção: criar um pool por chamada esgota rapidamente o limite
  // do MySQL em route handlers e Server Components.
  globalForPrisma.prisma = prisma;

  return prisma;
}
