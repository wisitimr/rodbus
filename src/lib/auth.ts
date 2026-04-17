import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GroupRole, MemberStatus, type User } from "@prisma/client";

const ACTIVE_GROUP_COOKIE = "activeGroupId";

export interface SessionMembership {
  id: string;
  role: GroupRole;
  partyGroupId: string;
  partyGroup: {
    id: string;
    name: string;
    ownerId: string | null;
    tripCount: number;
  };
}

export interface SessionContext {
  user: User;
  carCount: number;
  memberships: SessionMembership[];
  activeGroupId: string | null;
  activeMembership: SessionMembership | null;
  role: GroupRole | null;
}

const membershipInclude = {
  where: { status: MemberStatus.ACTIVE },
  orderBy: { createdAt: "asc" },
  include: {
    partyGroup: {
      include: { _count: { select: { trips: true } } },
    },
  },
} as const;

function flattenMembership(m: {
  id: string;
  role: GroupRole;
  partyGroupId: string;
  partyGroup: {
    id: string;
    name: string;
    ownerId: string | null;
    _count: { trips: number };
  };
}): SessionMembership {
  return {
    id: m.id,
    role: m.role,
    partyGroupId: m.partyGroupId,
    partyGroup: {
      id: m.partyGroup.id,
      name: m.partyGroup.name,
      ownerId: m.partyGroup.ownerId,
      tripCount: m.partyGroup._count.trips,
    },
  };
}

async function loadUserWithMemberships(clerkId: string) {
  const row = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      _count: { select: { ownedCars: true } },
      memberships: membershipInclude,
    },
  });
  if (!row) return null;
  const { _count, memberships, ...user } = row;
  return {
    user: user as User,
    carCount: _count.ownedCars,
    memberships: memberships.map(flattenMembership),
  };
}

async function upsertFirstTimeUser(clerkId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const row = await prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      name: clerkUser.fullName ?? clerkUser.firstName,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      image: clerkUser.imageUrl,
    },
    create: {
      clerkId: clerkUser.id,
      name: clerkUser.fullName ?? clerkUser.firstName,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      image: clerkUser.imageUrl,
    },
    include: {
      _count: { select: { ownedCars: true } },
      memberships: membershipInclude,
    },
  });
  const { _count, memberships, ...user } = row;
  return {
    user: user as User,
    carCount: _count.ownedCars,
    memberships: memberships.map(flattenMembership),
  };
}

/**
 * Consolidated per-request session context. One DB round-trip loads the user,
 * all active memberships (with group info + trip counts), and owned-car count.
 * React cache() dedupes across layout + page.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const [{ userId: clerkId }, cookieStore] = await Promise.all([auth(), cookies()]);
  if (!clerkId) return null;

  try {
    let data = await loadUserWithMemberships(clerkId);
    if (!data) data = await upsertFirstTimeUser(clerkId);
    if (!data) return null;

    const cookieGroupId = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value ?? null;
    const activeMembership =
      (cookieGroupId && data.memberships.find((m) => m.partyGroupId === cookieGroupId)) ||
      data.memberships[0] ||
      null;

    return {
      user: data.user,
      carCount: data.carCount,
      memberships: data.memberships,
      activeGroupId: activeMembership?.partyGroupId ?? null,
      activeMembership,
      role: activeMembership?.role ?? null,
    };
  } catch (error) {
    console.error("[getSessionContext] DB error:", error);
    return null;
  }
});

/** Get the current authenticated user (derived from session context). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const ctx = await getSessionContext();
  return ctx?.user ?? null;
});

/** Require an authenticated user or throw. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
