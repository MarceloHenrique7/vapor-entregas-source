import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { adminSeedEnvSchema } from "../src/server/auth/schemas";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não foi configurada.");
  }

  const admin = adminSeedEnvSchema.parse(process.env);
  const adapter = new PrismaMariaDb(databaseUrl);
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(admin.ADMIN_PASSWORD);

    await prisma.user.upsert({
      where: { email: admin.ADMIN_EMAIL },
      create: {
        role: "ADMIN",
        status: "ACTIVE",
        name: admin.ADMIN_NAME,
        email: admin.ADMIN_EMAIL,
        phone: admin.ADMIN_PHONE,
        passwordHash,
      },
      update: {
        role: "ADMIN",
        status: "ACTIVE",
        name: admin.ADMIN_NAME,
        phone: admin.ADMIN_PHONE,
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.info("Administrador inicial configurado com sucesso.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Falha ao configurar o administrador inicial.");
  process.exitCode = 1;
});
