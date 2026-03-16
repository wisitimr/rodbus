"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MemberStatus, GroupRole } from "@prisma/client";

const ACTIVE_GROUP_COOKIE = "activeGroupId";

export async function getActiveGroupId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_GROUP_COOKIE)?.value ?? null;
}

export async function setActiveGroupId(groupId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function requireGroupMembership(groupId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const membership = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId: user.id, partyGroupId: groupId } },
  });

  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    throw new Error("Not a member of this group");
  }

  return { user, membership };
}

export async function requireGroupAdmin(groupId: string) {
  const { user, membership } = await requireGroupMembership(groupId);

  if (membership.role !== GroupRole.ADMIN) {
    throw new Error("Admin access required for this group");
  }

  return { user, membership };
}

export async function getUserActiveGroups(userId: string) {
  const memberships = await prisma.partyGroupMember.findMany({
    where: { userId, status: MemberStatus.ACTIVE },
    include: { partyGroup: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.partyGroup.id,
    name: m.partyGroup.name,
    role: m.role,
    ownerId: m.partyGroup.ownerId,
  }));
}

/**
 * Get the active group ID for the current user.
 * If user has no active groups, redirect to /join.
 * If the cookie is stale (group no longer valid), pick the first active group.
 */
export async function getActiveGroupOrRedirect(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const groups = await getUserActiveGroups(user.id);

  if (groups.length === 0) {
    // Check if user has pending memberships
    const pendingCount = await prisma.partyGroupMember.count({
      where: { userId: user.id, status: MemberStatus.PENDING },
    });
    redirect(pendingCount > 0 ? "/pending-approval" : "/join");
  }

  const cookieGroupId = await getActiveGroupId();

  // If cookie group is still valid, use it
  if (cookieGroupId && groups.some((g) => g.id === cookieGroupId)) {
    return cookieGroupId;
  }

  // Otherwise, use the first group (cookie will be set when user switches via action)
  return groups[0].id;
}

/**
 * Check if the current user is an admin in the given group.
 * Returns the membership role without throwing.
 */
export async function getGroupRole(userId: string, groupId: string): Promise<GroupRole | null> {
  const membership = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId, partyGroupId: groupId } },
  });

  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    return null;
  }

  return membership.role;
}
