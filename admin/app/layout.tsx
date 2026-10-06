import type { Metadata } from "next";
import "./globals.css";
import "./commercial.css";

export const metadata: Metadata = {
  title: "radioAdmin Pro | Gestão comercial",
  description: "Administração comercial de emissoras de rádio",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
