import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battle Draft — Party Auto-Battler",
  description: "Draft chaotic gear, gamble on luck cards, and watch your friends fall in automatic tournament battles."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
