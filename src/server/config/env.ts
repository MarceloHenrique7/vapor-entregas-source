import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("mysql://"),
});

const authEnvSchema = z.object({
  AUTH_RATE_LIMIT_SECRET: z.string().min(32),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
});

const sensitiveDataEnvSchema = z.object({
  FIELD_ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "FIELD_ENCRYPTION_KEY deve conter exatamente 32 bytes em Base64."),
});

const mapsEnvSchema = z.object({
  GEOCODING_PROVIDER: z.enum(["nominatim", "disabled"]).default("nominatim"),
  GEOCODING_BASE_URL: z
    .string()
    .url()
    .default("https://nominatim.openstreetmap.org"),
  GEOCODING_USER_AGENT: z
    .string()
    .min(10)
    .default("VaporEntregas/1.0 (local development; configure a real contact)"),
  GEOCODING_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(604800)
    .default(86400),
});

const presenceEnvSchema = z.object({
  ONLINE_PRESENCE_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),
  PRESENCE_LOCATION_MIN_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(15)
    .max(300)
    .default(30),
});

const distanceEnvSchema = z.object({
  DISTANCE_PROVIDER: z
    .enum(["straight_line", "google_routes"])
    .default("straight_line"),
  GOOGLE_MAPS_API_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(10).optional(),
  ),
  GOOGLE_ROUTES_API_BASE_URL: z
    .string()
    .url()
    .default("https://routes.googleapis.com"),
  GOOGLE_ROUTES_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(10_000)
    .default(2_500),
  ROUTE_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(900)
    .default(180),
});

const subscriptionEnvSchema = z.object({
  NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: z.string().trim().min(10).optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().trim().min(20).optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().trim().min(16).optional(),
  MERCADO_PAGO_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.mercadopago.com"),
  MERCADO_PAGO_MODE: z.enum(["test", "production"]).default("test"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const optionalConfiguredText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(3).optional(),
);
const legalEnvSchema = z.object({
  LEGAL_OPERATOR_NAME: optionalConfiguredText,
  LEGAL_CONTACT_EMAIL: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().toLowerCase().email().optional(),
  ),
});

const prelaunchEnvSchema = z.object({
  PRELAUNCH_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  PRELAUNCH_TEST_USER_IDS: z
    .string()
    .default("")
    .transform((value, context) => {
      const ids = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      for (const id of ids) {
        if (!z.uuid().safeParse(id).success) {
          context.addIssue({
            code: "custom",
            message: "PRELAUNCH_TEST_USER_IDS contém um UUID inválido.",
          });
          return z.NEVER;
        }
      }
      return [...new Set(ids)];
    }),
});

export function getDatabaseEnv() {
  return databaseEnvSchema.parse(process.env);
}

export function getAuthEnv() {
  return authEnvSchema.parse(process.env);
}

export function getSensitiveDataEnv() {
  return sensitiveDataEnvSchema.parse(process.env);
}

export function getMapsEnv() {
  return mapsEnvSchema.parse(process.env);
}

export function getPresenceEnv() {
  return presenceEnvSchema.parse(process.env);
}

export function getDistanceEnv() {
  return distanceEnvSchema.parse(process.env);
}

export function getSubscriptionEnv() {
  const value = subscriptionEnvSchema.parse(process.env);
  if (value.MERCADO_PAGO_MODE === "production") {
    const appUrl = new URL(value.NEXT_PUBLIC_APP_URL);
    if (
      appUrl.protocol !== "https:" ||
      appUrl.hostname === "localhost" ||
      appUrl.hostname === "127.0.0.1" ||
      appUrl.hostname === "::1"
    ) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL deve usar um dominio HTTPS publico em producao.",
      );
    }
  }
  return value;
}

export function getLegalEnv() {
  const value = legalEnvSchema.parse(process.env);
  return {
    operatorName: value.LEGAL_OPERATOR_NAME ?? null,
    contactEmail: value.LEGAL_CONTACT_EMAIL ?? null,
  };
}

export function getPrelaunchEnv() {
  const value = prelaunchEnvSchema.parse(process.env);
  return {
    enabled: value.PRELAUNCH_MODE,
    testUserIds: value.PRELAUNCH_TEST_USER_IDS,
  };
}
