import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import BottomNav from "./bottom-nav";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activeGroupId = await getActiveGroupOrRedirect();
  const { role, carCount, tripCount } = await getCachedNavData(user.id, activeGroupId);

  if (!role) redirect("/join");

  const isAdmin = role === GroupRole.ADMIN;

  return (
    <div className="min-h-screen pb-20 standalone-pb-extra">
      {children}
      <BottomNav isAdmin={isAdmin} hasCars={carCount > 0} hasTrips={tripCount > 0} />
    </div>
  );
}
