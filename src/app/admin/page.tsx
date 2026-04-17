import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import UserManagement from "./user-management";
import CarManagement from "./car-management";
import InviteManagement from "./party-management";
import SettingsTabs from "./settings-tabs";

async function fetchAdminData(userId: string, activeGroupId: string) {
  const [groupMembers, myCars, partyGroup] = await Promise.all([
    prisma.partyGroupMember.findMany({
      where: { partyGroupId: activeGroupId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partyGroup.findUnique({
      where: { id: activeGroupId },
      select: { name: true, ownerId: true },
    }),
  ]);
  return { groupMembers, myCars, partyGroup };
}

const getCachedAdminData = unstable_cache(
  fetchAdminData,
  ["admin-data"],
  { tags: ["admin"], revalidate: 60 }
);

export default async function AdminPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");

  const userId = ctx.user.id;
  const activeGroupId = ctx.activeMembership.partyGroupId;

  const { groupMembers, myCars, partyGroup } = await getCachedAdminData(userId, activeGroupId);

  const users = groupMembers.map((m) => ({
    memberId: m.id,
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role,
    status: m.status,
  }));

  const currentUserRole = groupMembers.find((m) => m.userId === userId)?.role ?? "MEMBER";

  return (
    <main className="mx-auto max-w-lg p-4">
      <SettingsTabs
        usersTab={
          <UserManagement
            users={users}
            currentUserId={userId}
            currentUserRole={currentUserRole}
            groupId={activeGroupId}
            ownerId={partyGroup?.ownerId ?? ""}
          />
        }
        carsTab={
          <CarManagement
            cars={myCars.map((c) => ({
              id: c.id,
              name: c.name,
              licensePlate: c.licensePlate,
              defaultGasCost: c.defaultGasCost,
            }))}
          />
        }
        inviteTab={
          <InviteManagement
            groupId={activeGroupId}
            groupName={partyGroup?.name ?? ""}
            isOwner={partyGroup?.ownerId === userId}
          />
        }
      />
    </main>
  );
}
