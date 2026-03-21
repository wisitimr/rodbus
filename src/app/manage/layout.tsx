import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { ClipboardList } from "lucide-react";
import BottomNav from "@/app/dashboard/bottom-nav";

async function fetchNavData(userId: string, groupId: string) {
  const [role, carCount, tripCount] = await Promise.all([
    getGroupRole(userId, groupId),
    prisma.car.count({ where: { ownerId: userId } }),
    prisma.trip.count({ where: { partyGroupId: groupId }, take: 1 }),
  ]);
  return { role, carCount, tripCount };
}

const getCachedNavData = unstable_cache(
  fetchNavData,
  ["nav-data"],
  { tags: ["nav"], revalidate: 60 }
);

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activeGroupId = await getActiveGroupOrRedirect();
  const { role, carCount, tripCount } = await getCachedNavData(user.id, activeGroupId);
  if (role !== GroupRole.ADMIN) redirect("/dashboard");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {t.manageTrips}
            </h1>
            <p className="text-xs text-muted-foreground">{t.createTripsAndSettle}</p>
          </div>
        </div>
      </header>

      {children}
      <BottomNav isAdmin={true} hasCars={carCount > 0} hasTrips={tripCount > 0} />
    </div>
  );
}
