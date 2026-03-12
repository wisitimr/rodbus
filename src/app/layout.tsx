import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "RodBus NFC Tracking",
  description: "Track rides via NFC and split costs fairly",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
    <ClerkProvider dynamic>
      <html lang={locale}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 font-sans text-gray-900 antialiased">
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
