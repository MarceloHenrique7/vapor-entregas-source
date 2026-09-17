import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const mysqlTestUrl =
  process.env.MYSQL_TEST_DATABASE_URL ??
  loadEnv("test", process.cwd(), "").MYSQL_TEST_DATABASE_URL;

// Esta atribuição precisa acontecer durante o carregamento da configuração,
// antes que os imports ESM dos repositories possam inicializar o Prisma.
if (mysqlTestUrl) {
  process.env.MYSQL_TEST_DATABASE_URL = mysqlTestUrl;
  process.env.DATABASE_URL = mysqlTestUrl;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.mysql.test.ts"],
    fileParallelism: false,
  },
});
