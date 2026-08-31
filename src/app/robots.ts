import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/form", "/termos", "/privacidade"],
      disallow: ["/admin", "/app", "/api", "/entrar", "/cadastro"],
    },
  };
}
