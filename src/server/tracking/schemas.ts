import { z } from "zod";

export const trackingDeliveryIdSchema = z.string().uuid();

export const trackingTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Token de rastreamento inválido.");

export const trackingLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().min(0).max(250),
    capturedAt: z.iso.datetime(),
  })
  .transform((value) => ({
    latitude: Math.round(value.latitude * 1_000_000) / 1_000_000,
    longitude: Math.round(value.longitude * 1_000_000) / 1_000_000,
    accuracyMeters: Math.round(value.accuracyMeters * 100) / 100,
    capturedAt: new Date(value.capturedAt),
  }));

export type TrackingLocationInput = z.infer<typeof trackingLocationSchema>;
