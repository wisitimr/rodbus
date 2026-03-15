import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGroupOrRedirect, getGroupRole } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";
import BottomNav from "./bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activeGroupId = await getActiveGroupOrRedirect();
  const role = await getGroupRole(user.id, activeGroupId);

  if (!role) redirect("/join");

  const isAdmin = role === GroupRole.ADMIN;

  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
