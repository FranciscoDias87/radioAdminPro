import type { Metadata } from "next";
import "./globals.css";
import "./commercial.css";
import "./brand.css";
import "./mobile.css";
import "./theme-refinements.css";
import "./contract-forms.css";
import "./sidebar-refinements.css";
import "./draft-preview.css";

export const metadata: Metadata = {
  title: "Meio Norte FM | radioAdmin Pro",
  description: "Gestão comercial da Meio Norte FM 89,1, Água Branca",
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
