export type DatabasePoolOptions = {
  connectionLimit: number;
  minimumIdle: number;
  acquireTimeout: number;
  connectTimeout: number;
  idleTimeout: number;
};

/** Perfil conservador para MySQL compartilhado e hot reload do Next.js. */
export const DEFAULT_DATABASE_POOL_OPTIONS: DatabasePoolOptions = {
  connectionLimit: 2,
  minimumIdle: 0,
  acquireTimeout: 15_000,
  connectTimeout: 10_000,
  idleTimeout: 600,
};

const URL_KEYS: Record<keyof DatabasePoolOptions, string> = {
  connectionLimit: "connectionLimit",
  minimumIdle: "minimumIdle",
  acquireTimeout: "acquireTimeout",
  connectTimeout: "connectTimeout",
  idleTimeout: "idleTimeout",
};

/** Adiciona padrões sem substituir opções explícitas da DATABASE_URL. */
export function withDatabasePoolOptions(
  databaseUrl: string,
  options: DatabasePoolOptions = DEFAULT_DATABASE_POOL_OPTIONS,
) {
  const url = new URL(databaseUrl);

  for (const key of Object.keys(URL_KEYS) as Array<keyof DatabasePoolOptions>) {
    const urlKey = URL_KEYS[key];
    if (!url.searchParams.has(urlKey)) {
      url.searchParams.set(urlKey, String(options[key]));
    }
  }

  return url.toString();
}
