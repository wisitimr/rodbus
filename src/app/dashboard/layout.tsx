import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";
import BottomNav from "./bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role === Role.PENDING) redirect("/pending-approval");

  const isAdmin = user.role === Role.ADMIN;

  return (
    <div className="min-h-screen pb-24">
      {children}
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
