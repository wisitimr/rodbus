"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireGroupAdmin, requireGroupMembership, setActiveGroupId } from "@/lib/party-group";
import { GroupRole, MemberStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Group CRUD
// ---------------------------------------------------------------------------

/** Create a new party group. Only admins/owners can create new groups. */
export async function createGroup(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!name.trim()) throw new Error("Group name is required");

  // Only admins/owners of an existing group can create new parties
  const existingMembership = await prisma.partyGroupMember.findFirst({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
    include: { partyGroup: true },
  });
  if (!existingMembership) throw new Error("Only admins can create new parties");
  const isAdmin = existingMembership.role === GroupRole.ADMIN;
  const isOwner = existingMembership.partyGroup.ownerId === user.id;
  if (!isAdmin && !isOwner) throw new Error("Only admins can create new parties");

  const group = await prisma.partyGroup.create({
    data: {
      name: name.trim(),
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: GroupRole.ADMIN,
          status: MemberStatus.ACTIVE,
        },
      },
    },
  });

  await setActiveGroupId(group.id);
  revalidatePath("/");
  return group;
}

/** Update the name of a party group. Only admins can do this. */
export async function updateGroupName(groupId: string, name: string) {
  await requireGroupAdmin(groupId);

  if (!name.trim()) throw new Error("Group name is required");

  await prisma.partyGroup.update({
    where: { id: groupId },
    data: { name: name.trim() },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Join via Group ID
// ---------------------------------------------------------------------------

/** Join a group by its ID. Creates a PENDING membership. */
export async function joinViaGroupId(groupId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const group = await prisma.partyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });

  if (!group) throw new Error("Invalid invite link");

  // Check if already a member
  const existing = await prisma.partyGroupMember.findUnique({
    where: {
      userId_partyGroupId: { userId: user.id, partyGroupId: group.id },
    },
  });

  if (existing) {
    if (existing.status === MemberStatus.ACTIVE) {
      return { status: "already_member" as const, groupName: group.name };
    }
    return { status: "already_pending" as const, groupName: group.name };
  }

  await prisma.partyGroupMember.create({
    data: {
      userId: user.id,
      partyGroupId: group.id,
      role: GroupRole.MEMBER,
      status: MemberStatus.PENDING,
    },
  });

  revalidatePath("/admin");
  return { status: "pending" as const, groupName: group.name };
}

// ---------------------------------------------------------------------------
// Member Management (admin only)
// ---------------------------------------------------------------------------

/** Approve a pending join request. */
export async function approveJoinRequest(memberId: string, groupId: string) {
  await requireGroupAdmin(groupId);

  await prisma.partyGroupMember.update({
    where: { id: memberId, partyGroupId: groupId },
    data: { status: MemberStatus.ACTIVE },
  });

  revalidatePath("/admin");
  revalidatePath("/join");
}

/** Reject a pending join request (deletes the membership). */
export async function rejectJoinRequest(memberId: string, groupId: string) {
  await requireGroupAdmin(groupId);

  await prisma.partyGroupMember.delete({
    where: { id: memberId, partyGroupId: groupId },
  });

  revalidatePath("/admin");
}

/** Remove an active member from the group (kick). Admins can remove members, but not the party owner. */
export async function removeGroupMember(memberId: string, groupId: string) {
  const { user } = await requireGroupAdmin(groupId);

  const group = await prisma.partyGroup.findUnique({ where: { id: groupId }, select: { ownerId: true } });
  if (!group) throw new Error("Group not found");

  const member = await prisma.partyGroupMember.findUnique({
    where: { id: memberId, partyGroupId: groupId },
  });

  if (!member) throw new Error("Member not found");
  if (member.userId === user.id) throw new Error("Cannot remove yourself");
  if (member.userId === group.ownerId) throw new Error("Cannot remove the party owner");

  await prisma.partyGroupMember.delete({
    where: { id: memberId },
  });

  revalidatePath("/admin");
}

/** Change a member's role (admin only). Prevents demoting the last admin. */
export async function setGroupMemberRole(
  memberId: string,
  groupId: string,
  role: GroupRole
): Promise<{ error?: string }> {
  const { user } = await requireGroupAdmin(groupId);

  const group = await prisma.partyGroup.findUnique({ where: { id: groupId }, select: { ownerId: true } });
  if (!group) return { error: "Group not found" };

  const member = await prisma.partyGroupMember.findUnique({
    where: { id: memberId, partyGroupId: groupId },
  });

  if (!member) return { error: "Member not found" };

  // Prevent changing the owner's role
  if (member.userId === group.ownerId && user.id !== group.ownerId) {
    return { error: "Cannot change the owner's role" };
  }

  // Prevent demoting yourself if you're the last admin
  if (member.userId === user.id && role !== GroupRole.ADMIN) {
    const adminCount = await prisma.partyGroupMember.count({
      where: { partyGroupId: groupId, role: GroupRole.ADMIN, status: MemberStatus.ACTIVE },
    });
    if (adminCount <= 1) {
      return { error: "Cannot demote the last admin" };
    }
  }

  await prisma.partyGroupMember.update({
    where: { id: memberId },
    data: { role },
  });

  revalidatePath("/admin");
  return {};
}

/** Transfer party ownership to another admin member. Only the current owner can do this. */
export async function transferOwnership(
  targetMemberId: string,
  groupId: string
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const group = await prisma.partyGroup.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) return { error: "Group not found" };
  if (group.ownerId !== user.id) return { error: "Only the current owner can transfer ownership" };

  const targetMember = await prisma.partyGroupMember.findUnique({
    where: { id: targetMemberId, partyGroupId: groupId },
    select: { userId: true, role: true, status: true },
  });
  if (!targetMember) return { error: "Member not found" };
  if (targetMember.status !== MemberStatus.ACTIVE) return { error: "Member is not active" };

  // Transfer ownership and ensure target becomes ADMIN
  await prisma.$transaction([
    prisma.partyGroup.update({
      where: { id: groupId },
      data: { ownerId: targetMember.userId },
    }),
    ...(targetMember.role !== GroupRole.ADMIN
      ? [prisma.partyGroupMember.update({
          where: { id: targetMemberId },
          data: { role: GroupRole.ADMIN },
        })]
      : []),
  ]);

  revalidatePath("/admin");
  return {};
}

// ---------------------------------------------------------------------------
// Self-service
// ---------------------------------------------------------------------------

/** Leave a group. Prevents leaving if you're the last admin. */
export async function leaveGroup(groupId: string) {
  const { user, membership } = await requireGroupMembership(groupId);

  if (membership.role === GroupRole.ADMIN) {
    const adminCount = await prisma.partyGroupMember.count({
      where: { partyGroupId: groupId, role: GroupRole.ADMIN, status: MemberStatus.ACTIVE },
    });
    if (adminCount <= 1) {
      throw new Error("Cannot leave — you are the last admin. Promote another member first.");
    }
  }

  await prisma.partyGroupMember.delete({
    where: { id: membership.id },
  });

  revalidatePath("/");
}

/** Delete a party group and all its data (creator only).
 *  Returns remaining groups so the caller can redirect appropriately. */
export async function deleteGroup(groupId: string): Promise<{ remainingGroups: { id: string; name: string }[] }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const group = await prisma.partyGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");
  if (group.ownerId !== user.id) throw new Error("Only the party owner can delete it");

  // Delete trips (and their checkIns via cascade) belonging to this group
  await prisma.trip.deleteMany({ where: { partyGroupId: groupId } });

  // PartyGroupMember cascades from PartyGroup
  await prisma.partyGroup.delete({ where: { id: groupId } });

  // Find remaining groups
  const memberships = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
    include: { partyGroup: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const remainingGroups = memberships.map((m) => m.partyGroup);

  // If only one group left, auto-switch
  if (remainingGroups.length === 1) {
    await setActiveGroupId(remainingGroups[0].id);
  }

  revalidatePath("/");
  return { remainingGroups };
}

/** Switch the active group (sets cookie). */
export async function switchActiveGroup(groupId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  // Verify membership
  const membership = await prisma.partyGroupMember.findUnique({
    where: { userId_partyGroupId: { userId: user.id, partyGroupId: groupId } },
  });

  if (!membership || membership.status !== MemberStatus.ACTIVE) {
    throw new Error("Not a member of this group");
  }

  await setActiveGroupId(groupId);
  revalidatePath("/");
}
