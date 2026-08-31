import { ReportRateLimitError } from "./errors";

const WINDOW_MS = 60 * 60 * 1_000;
const MAX_REPORTS = 5;
const attempts = new Map<string, number[]>();

export function enforceReportRateLimit(userId: string, now = Date.now()) {
  const recent = (attempts.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < WINDOW_MS,
  );
  if (recent.length >= MAX_REPORTS) {
    throw new ReportRateLimitError(
      Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1_000)),
    );
  }
  recent.push(now);
  attempts.set(userId, recent);
}
