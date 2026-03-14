import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { Clock } from "lucide-react";

export default async function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t.history}
            </h1>
            <p className="text-xs text-muted-foreground">{t.trips}, {t.payments} &amp; {t.summary}</p>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}
