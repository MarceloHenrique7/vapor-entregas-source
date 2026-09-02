export const ACCESS_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

export function calculateAccessPeriod(
  currentStart: Date | null,
  currentEnd: Date | null,
  approvedAt: Date,
) {
  const stillActive = Boolean(currentEnd && currentEnd > approvedAt);
  const base = stillActive ? currentEnd! : approvedAt;
  return {
    startsAt: stillActive ? (currentStart ?? approvedAt) : approvedAt,
    expiresAt: new Date(base.getTime() + ACCESS_DURATION_MS),
  };
}
