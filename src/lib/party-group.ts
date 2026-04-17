"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/auth";
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
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("Not authenticated");

  const membership = ctx.memberships.find((m) => m.partyGroupId === groupId);
  if (membership) {
    return { user: ctx.user, membership: { id: membership.id, role: membership.role } };
  }

  // Fallback for groups the user cached as inactive or cross-group admin actions
  const row = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId: ctx.user.id, partyGroupId: groupId } },
  });
  if (!row || row.status !== MemberStatus.ACTIVE) {
    throw new Error("Not a member of this group");
  }
  return { user: ctx.user, membership: row };
}

export async function requireGroupAdmin(groupId: string) {
  const { user, membership } = await requireGroupMembership(groupId);

  if (membership.role !== GroupRole.ADMIN) {
    throw new Error("Admin access required for this group");
  }

  return { user, membership };
}

export async function getUserActiveGroups(userId: string) {
  const ctx = await getSessionContext();
  if (ctx && ctx.user.id === userId) {
    return ctx.memberships.map((m) => ({
      id: m.partyGroup.id,
      name: m.partyGroup.name,
      role: m.role,
      ownerId: m.partyGroup.ownerId,
    }));
  }

  // Fallback: cross-user lookup (not cached in this request's session context)
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
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");

  if (ctx.activeGroupId) return ctx.activeGroupId;

  // No active memberships — check for pending before redirecting to join
  const pendingCount = await prisma.partyGroupMember.count({
    where: { userId: ctx.user.id, status: MemberStatus.PENDING },
  });
  redirect(pendingCount > 0 ? "/pending-approval" : "/join");
}

/**
 * Check the user's role in the given group.
 * Returns the membership role without throwing.
 */
export async function getGroupRole(userId: string, groupId: string): Promise<GroupRole | null> {
  const ctx = await getSessionContext();
  if (ctx && ctx.user.id === userId) {
    const membership = ctx.memberships.find((m) => m.partyGroupId === groupId);
    return membership?.role ?? null;
  }

  // Fallback for cross-user lookups (rare)
  const row = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId, partyGroupId: groupId } },
  });
  if (!row || row.status !== MemberStatus.ACTIVE) return null;
  return row.role;
}
