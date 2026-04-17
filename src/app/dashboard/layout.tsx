import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { GroupRole } from "@prisma/client";
import BottomNav from "./bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");

  const isAdmin = ctx.activeMembership.role === GroupRole.ADMIN;
  const hasCars = ctx.carCount > 0;
  const hasTrips = ctx.activeMembership.partyGroup.tripCount > 0;

  return (
    <div className="min-h-screen pb-20 standalone-pb-extra">
      {children}
      <BottomNav isAdmin={isAdmin} hasCars={hasCars} hasTrips={hasTrips} />
    </div>
  );
}
