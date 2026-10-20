import type { Metadata } from "next";
import { preload } from "react-dom";
import "./fonts.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site";

// Fontes do próprio repo (NEU-176), sem baixar do Google no build. Pré-carrega só
// o latin de cada família, como o next/font/google fazia.
const PRELOADED_FONTS = [
  "/fonts/space-grotesk-latin.woff2",
  "/fonts/inter-latin.woff2",
  "/fonts/jetbrains-mono-latin.woff2",
];

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  for (const href of PRELOADED_FONTS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });
  }

  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex min-h-full flex-col bg-bg text-fg antialiased">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
