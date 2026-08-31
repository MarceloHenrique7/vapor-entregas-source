import { z } from "zod";

export const presenceCoordinatesSchema = z.object({
  latitude: z
    .number()
    .finite()
    .min(-90)
    .max(90)
    .transform((value) => Math.round(value * 1_000_000) / 1_000_000),
  longitude: z
    .number()
    .finite()
    .min(-180)
    .max(180)
    .transform((value) => Math.round(value * 1_000_000) / 1_000_000),
});

export type PresenceCoordinates = z.infer<typeof presenceCoordinatesSchema>;
