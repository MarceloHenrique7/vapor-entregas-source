import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Vapor Entregas",
    short_name: "Vapor",
    description:
      "Conexão local entre empresas e motoboys independentes. Suas entregas, a todo vapor.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f7f7",
    theme_color: "#ea1d2c",
    lang: "pt-BR",
    categories: ["business", "navigation", "productivity"],
    icons: [
      {
        src: "/icons/vapor-entregas-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vapor-entregas-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/vapor-entregas-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
