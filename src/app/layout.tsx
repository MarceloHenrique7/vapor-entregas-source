import type { Metadata, Viewport } from "next";

import "./globals.css";
import { PwaRegistration } from "@/components/pwa/pwa-registration";

const description =
  "Conexão local entre empresas e motoboys independentes. Suas entregas, a todo vapor.";

export const metadata: Metadata = {
  title: {
    default: "Vapor Entregas",
    template: "%s | Vapor Entregas",
  },
  description,
  applicationName: "Vapor Entregas",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Vapor Entregas",
    title: "Vapor Entregas",
    description,
  },
  twitter: {
    card: "summary",
    title: "Vapor Entregas",
    description,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vapor Entregas",
  },
  icons: {
    icon: [
      {
        url: "/icons/vapor-entregas-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      { url: "/icons/vapor-entregas-192.png", sizes: "192x192" },
      { url: "/icons/vapor-entregas-512.png", sizes: "512x512" },
    ],
    apple: "/icons/vapor-entregas-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ea1d2c",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
