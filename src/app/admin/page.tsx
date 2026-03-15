import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveGroupOrRedirect } from "@/lib/party-group";
import { MemberStatus } from "@prisma/client";
import UserManagement from "./user-management";
import CarManagement from "./car-management";
import InviteManagement from "./invite-management";
import SettingsTabs from "./settings-tabs";

export default async function AdminPage() {
  const user = (await getCurrentUser())!;
  const userId = user.id;
  const activeGroupId = await getActiveGroupOrRedirect();

  const [groupMembers, myCars, inviteTokens, partyGroup] = await Promise.all([
    prisma.partyGroupMember.findMany({
      where: { partyGroupId: activeGroupId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.car.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, licensePlate: true, defaultGasCost: true },
    }),
    prisma.inviteToken.findMany({
      where: { partyGroupId: activeGroupId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partyGroup.findUnique({
      where: { id: activeGroupId },
      select: { name: true, ownerId: true },
    }),
  ]);

  const users = groupMembers.map((m) => ({
    memberId: m.id,
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    status: m.status,
  }));

  const tokens = inviteTokens.map((t) => ({
    id: t.id,
    token: t.token,
    expiresAt: t.expiresAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    isExpired: t.expiresAt < new Date(),
  }));

  return (
    <main className="mx-auto max-w-lg p-4">
      <SettingsTabs
        usersTab={
          <UserManagement
            users={users}
            currentUserId={userId}
            groupId={activeGroupId}
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
            tokens={tokens}
            groupId={activeGroupId}
            groupName={partyGroup?.name ?? ""}
            isOwner={partyGroup?.ownerId === userId}
          />
        }
      />
    </main>
  );
}
