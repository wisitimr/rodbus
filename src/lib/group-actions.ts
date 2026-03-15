"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireGroupAdmin, requireGroupMembership, setActiveGroupId } from "@/lib/party-group";
import { GroupRole, MemberStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Group CRUD
// ---------------------------------------------------------------------------

/** Create a new party group. The creator becomes ADMIN. */
export async function createGroup(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  if (!name.trim()) throw new Error("Group name is required");

  const group = await prisma.partyGroup.create({
    data: {
      name: name.trim(),
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

// ---------------------------------------------------------------------------
// Invite Links
// ---------------------------------------------------------------------------

/** Generate an invite link with expiry (admin only). */
export async function generateInviteLink(groupId: string, expiresInDays: number = 7) {
  await requireGroupAdmin(groupId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const token = await prisma.inviteToken.create({
    data: { partyGroupId: groupId, expiresAt },
  });

  revalidatePath("/admin");
  return token;
}

/** Revoke an invite link (admin only). */
export async function revokeInviteLink(tokenId: string, groupId: string) {
  await requireGroupAdmin(groupId);

  await prisma.inviteToken.delete({ where: { id: tokenId } });
  revalidatePath("/admin");
}

/** Join a group via invite token. Creates a PENDING membership. */
export async function joinViaInvite(tokenValue: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const token = await prisma.inviteToken.findUnique({
    where: { token: tokenValue },
    include: { partyGroup: { select: { id: true, name: true } } },
  });

  if (!token) throw new Error("Invalid invite link");
  if (token.expiresAt < new Date()) throw new Error("Invite link has expired");

  // Check if already a member
  const existing = await prisma.partyGroupMember.findUnique({
    where: {
      userId_partyGroupId: { userId: user.id, partyGroupId: token.partyGroupId },
    },
  });

  if (existing) {
    if (existing.status === MemberStatus.ACTIVE) {
      return { status: "already_member" as const, groupName: token.partyGroup.name };
    }
    // Already pending
    return { status: "already_pending" as const, groupName: token.partyGroup.name };
  }

  await prisma.partyGroupMember.create({
    data: {
      userId: user.id,
      partyGroupId: token.partyGroupId,
      role: GroupRole.MEMBER,
      status: MemberStatus.PENDING,
    },
  });

  revalidatePath("/admin");
  return { status: "pending" as const, groupName: token.partyGroup.name };
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

/** Remove an active member from the group (kick). */
export async function removeGroupMember(memberId: string, groupId: string) {
  const { user } = await requireGroupAdmin(groupId);

  const member = await prisma.partyGroupMember.findUnique({
    where: { id: memberId, partyGroupId: groupId },
  });

  if (!member) throw new Error("Member not found");
  if (member.userId === user.id) throw new Error("Cannot remove yourself");

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

  const member = await prisma.partyGroupMember.findUnique({
    where: { id: memberId, partyGroupId: groupId },
  });

  if (!member) return { error: "Member not found" };

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
