import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { detectLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RodBus NFC Tracker",
  description: "Track rides via NFC and split costs fairly",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RodBus",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));

  return (
    <ClerkProvider>
      <html lang={locale} className={inter.variable}>
        <body className="min-h-screen bg-background font-sans text-foreground antialiased">
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
