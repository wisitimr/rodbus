import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import BottomNav from "./bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activeGroupId = await getActiveGroupOrRedirect();
  const [role, carCount, tripCount] = await Promise.all([
    getGroupRole(user.id, activeGroupId),
    prisma.car.count({ where: { ownerId: user.id } }),
    prisma.trip.count({ where: { partyGroupId: activeGroupId }, take: 1 }),
  ]);

  if (!role) redirect("/join");

  const isAdmin = role === GroupRole.ADMIN;

  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav isAdmin={isAdmin} hasCars={carCount > 0} hasTrips={tripCount > 0} />
    </div>
  );
}
