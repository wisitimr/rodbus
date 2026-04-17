import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { GroupRole } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { Settings } from "lucide-react";
import BottomNav from "@/app/dashboard/bottom-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");
  if (ctx.activeMembership.role !== GroupRole.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const hasCars = ctx.carCount > 0;
  const hasTrips = ctx.activeMembership.partyGroup.tripCount > 0;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t.settings}
            </h1>
            <p className="text-xs text-muted-foreground">{t.settingsSubtitle}</p>
          </div>
        </div>
      </header>

      {children}
      <BottomNav isAdmin={true} hasCars={hasCars} hasTrips={hasTrips} />
    </div>
  );
}
