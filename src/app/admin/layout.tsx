import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { Settings } from "lucide-react";
import BottomNav from "@/app/dashboard/bottom-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activeGroupId = await getActiveGroupOrRedirect();
  const [role, carCount] = await Promise.all([
    getGroupRole(user.id, activeGroupId),
    prisma.car.count({ where: { ownerId: user.id } }),
  ]);
  if (role !== GroupRole.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

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
      <BottomNav isAdmin={true} hasCars={carCount > 0} />
    </div>
  );
}
