"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";

export default function OpenInBrowserClient({
  targetUrl,
  locale,
}: {
  targetUrl: string;
  locale: Locale;
}) {
  const t = getTranslations(locale);
  const [fullUrl, setFullUrl] = useState(targetUrl);
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [isIos, setIsIos] = useState(false);

  // Auto-open in default browser on mount
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${targetUrl}`;
    setFullUrl(url);

    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    setIsIos(ios);

    let opened = false;

    // Android: use Intent to launch default browser
    if (/Android/i.test(ua)) {
      const intentUrl = `intent://${window.location.host}${targetUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
      opened = true;
    }

    // LINE in-app browser: supports openExternalBrowser param
    if (/Line/i.test(ua)) {
      const sep = url.includes("?") ? "&" : "?";
      window.location.href = `${url}${sep}openExternalBrowser=1`;
      opened = true;
    }

    // Facebook/Instagram on iOS: try googlechrome scheme
    if (ios && /FBAN|FBAV|Instagram/i.test(ua)) {
      const chromeUrl = url.replace(/^https?:\/\//, "googlechrome://");
      window.location.href = chromeUrl;
      opened = true;
    }

    // General fallback: try window.open
    if (!opened) {
      try {
        const w = window.open(url, "_system");
        if (w) opened = true;
      } catch {
        // ignore
      }
    }

    // Show manual instructions after a delay if user is still on this page
    const timer = setTimeout(() => setShowManual(true), 1500);
    return () => clearTimeout(timer);
  }, [targetUrl]);

  const handleOpen = useCallback(() => {
    const ua = navigator.userAgent;

    // Android Intent
    if (/Android/i.test(ua)) {
      const intentUrl = `intent://${window.location.host}${targetUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      window.location.href = intentUrl;
      return;
    }

    // LINE
    if (/Line/i.test(ua)) {
      const sep = fullUrl.includes("?") ? "&" : "?";
      window.location.href = `${fullUrl}${sep}openExternalBrowser=1`;
      return;
    }

    // iOS Facebook/Instagram → Chrome scheme
    if (isIos && /FBAN|FBAV|Instagram/i.test(ua)) {
      const chromeUrl = fullUrl.replace(/^https?:\/\//, "googlechrome://");
      window.location.href = chromeUrl;
      return;
    }

    // Fallback
    window.open(fullUrl, "_system") || (window.location.href = fullUrl);
  }, [targetUrl, fullUrl, isIos]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ExternalLink className="h-8 w-8 text-primary" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t.openInBrowser}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.openInBrowserDesc}
          </p>
        </div>

        {/* Loading spinner while auto-redirect attempts */}
        {!showManual && (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Manual controls shown after delay */}
        {showManual && (
          <>
            <button
              onClick={handleOpen}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" />
              {t.openInBrowserButton}
            </button>

            <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
              <code className="text-xs text-muted-foreground select-all break-all">
                {fullUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {isIos && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-left">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t.openInBrowserIosHint}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
