import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      isDevelopment
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://connect.facebook.net"
        : "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://www.facebook.com",
      isDevelopment
        ? "connect-src 'self' ws: wss: https://api.mercadopago.com https://*.mercadopago.com https://*.mercadopago.com.br https://connect.facebook.net https://www.facebook.com"
        : "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://*.mercadopago.com.br https://connect.facebook.net https://www.facebook.com",
      "frame-src 'self' https://*.mercadopago.com https://*.mercadopago.com.br",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
