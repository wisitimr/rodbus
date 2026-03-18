"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";

const messages = {
  en: {
    title: "Open in Browser",
    desc: "This link doesn't work in the in-app browser. Please open it in Chrome or Safari instead.",
    button: "Open in Browser",
    manual: "If the button doesn't work, copy this URL and paste it in your browser:",
  },
  th: {
    title: "เปิดในเบราว์เซอร์",
    desc: "ลิงก์นี้ไม่สามารถใช้งานในเบราว์เซอร์ภายในแอปได้ กรุณาเปิดใน Chrome หรือ Safari",
    button: "เปิดในเบราว์เซอร์",
    manual: "หากปุ่มไม่ทำงาน ให้คัดลอก URL นี้แล้ววางในเบราว์เซอร์:",
  },
} as const;

export default function OpenInBrowserClient({
  targetUrl,
  locale,
}: {
  targetUrl: string;
  locale: "en" | "th";
}) {
  const t = messages[locale];
  const fullUrl = typeof window !== "undefined"
    ? `${window.location.origin}${targetUrl}`
    : targetUrl;

  // Try to auto-open in external browser via Android Intent
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
      const intentUrl = `intent://${window.location.host}${targetUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
    }
  }, [targetUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ExternalLink className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
        </div>

        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4" />
          {t.button}
        </a>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t.manual}</p>
          <code className="block rounded-lg bg-muted px-3 py-2 text-xs text-foreground select-all break-all">
            {fullUrl}
          </code>
        </div>
      </div>
    </main>
  );
}
