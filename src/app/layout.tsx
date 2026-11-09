import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Manrope({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Matheus Automóveis — Veículos novos e seminovos selecionados",
    template: "%s | Matheus Automóveis",
  },
  description:
    "Concessionária com veículos novos e seminovos revisados, procedência garantida, financiamento facilitado e avaliação justa do seu usado.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Matheus Automóveis" },
};

export const viewport: Viewport = {
  themeColor: "#17171c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
