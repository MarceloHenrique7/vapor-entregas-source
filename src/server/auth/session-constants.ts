export const SESSION_COOKIE_NAME = "entregavale_session";

export function getSessionCookieOptions(
  expiresAt: Date,
  production = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
