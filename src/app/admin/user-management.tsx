"use client";

import { useState, useRef, useEffect } from "react";
import { Crown, ShieldCheck, Trash2, UserRoundCog, X } from "lucide-react";
import { approveJoinRequest, rejectJoinRequest, removeGroupMember, setGroupMemberRole, transferOwnership } from "@/lib/group-actions";
import { useT } from "@/lib/i18n-context";
import type { GroupRole, MemberStatus } from "@prisma/client";

interface UserManagementProps {
  users: {
    memberId: string;
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: GroupRole;
    status: MemberStatus;
  }[];
  currentUserId: string;
  groupId: string;
  ownerId: string;
}

const roleBadgeStyle: Record<string, string> = {
  MEMBER: "bg-muted text-muted-foreground",
  ADMIN: "bg-debt/10 text-debt",
  OWNER: "bg-primary/10 text-primary",
};

export default function UserManagement({ users, currentUserId, groupId, ownerId }: UserManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === ownerId;
  const isAnyLoading = loadingAction !== null;
  const pendingUsers = users.filter((u) => u.status === "PENDING");
  const activeUsers = users.filter((u) => u.status === "ACTIVE");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuId(null);
      }
    }
    if (roleMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [roleMenuId]);

  async function handleApprove(memberId: string) {
    setLoadingAction(`approve-${memberId}`);
    try {
      await approveJoinRequest(memberId, groupId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject(memberId: string) {
    setLoadingAction(`reject-${memberId}`);
    try {
      await rejectJoinRequest(memberId, groupId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm(t.confirmDeleteUser)) return;
    setLoadingAction(`remove-${memberId}`);
    try {
      await removeGroupMember(memberId, groupId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRoleChange(memberId: string, newRole: GroupRole) {
    setRoleMenuId(null);
    setLoadingAction(`role-${memberId}`);
    try {
      const result = await setGroupMemberRole(memberId, groupId, newRole);
      if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleTransferOwnership(memberId: string) {
    setConfirmTransfer(null);
    setRoleMenuId(null);
    setLoadingAction(`transfer-${memberId}`);
    try {
      const result = await transferOwnership(memberId, groupId);
      if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  function getRoleBadge(user: { id: string; role: GroupRole }) {
    if (user.id === ownerId) {
      return { style: roleBadgeStyle.OWNER, label: t.partyOwner.toUpperCase() };
    }
    if (user.role === "ADMIN") {
      return { style: roleBadgeStyle.ADMIN, label: t.coHost.toUpperCase() };
    }
    return { style: roleBadgeStyle.MEMBER, label: t.member.toUpperCase() };
  }

  return (
    <div className="space-y-4">
      {/* Pending Join Requests */}
      {pendingUsers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-warning">
            {t.pendingApproval} ({pendingUsers.length})
          </h3>
          {pendingUsers.map((user) => {
            const initial = (user.name || "?")[0].toUpperCase();
            const isLoading = loadingAction === `approve-${user.memberId}` || loadingAction === `reject-${user.memberId}`;
            return (
              <div
                key={user.memberId}
                className={`flex items-center gap-3 rounded-xl border-2 border-warning/30 bg-warning/5 p-3 animate-fade-in transition-opacity ${isLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-warning/20 text-sm font-bold text-warning">
                  {user.image ? (
                    <img src={user.image} alt={user.name ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{user.name ?? t.noName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleApprove(user.memberId)}
                    disabled={isAnyLoading}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-settled px-3 py-2 text-sm font-semibold text-white transition hover:bg-settled/90 active:scale-[0.98] disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {t.approve}
                    {loadingAction === `approve-${user.memberId}` && "..."}
                  </button>
                  <button
                    onClick={() => handleReject(user.memberId)}
                    disabled={isAnyLoading}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Members */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t.allUsersLabel} ({activeUsers.length})
        </h3>
        {activeUsers.map((user) => {
          const isMe = user.id === currentUserId;
          const isUserOwner = user.id === ownerId;
          const initial = (user.name || "?")[0].toUpperCase();
          const { style: badge, label: badgeLabel } = getRoleBadge(user);
          const isLoading = loadingAction === `remove-${user.memberId}` || loadingAction === `role-${user.memberId}` || loadingAction === `transfer-${user.memberId}`;
          const canManage = !isMe && (!isUserOwner || isOwner);
          const canRemove = !isMe && !isUserOwner;
          return (
            <div
              key={user.memberId}
              className={`relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 animate-fade-in transition-opacity ${isLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                {user.image ? (
                  <img src={user.image} alt={user.name ?? ""} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{user.name ?? t.noName}</p>
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${badge}`}>
                    {badgeLabel}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              {canManage && (
                <div className="relative shrink-0" ref={roleMenuId === user.memberId ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setRoleMenuId(roleMenuId === user.memberId ? null : user.memberId)}
                    disabled={isAnyLoading}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    <UserRoundCog className="h-4 w-4" />
                  </button>
                  {roleMenuId === user.memberId && (
                    <div className="absolute right-0 z-10 mt-1 w-40 rounded-xl border border-border bg-card p-1.5 shadow-lg animate-fade-in">
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.memberId, "MEMBER" as GroupRole)}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent ${user.role === "MEMBER" && !isUserOwner ? "text-primary" : "text-foreground"}`}
                      >
                        {t.member.toUpperCase()}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.memberId, "ADMIN" as GroupRole)}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent ${user.role === "ADMIN" && !isUserOwner ? "text-primary" : "text-foreground"}`}
                      >
                        {t.coHost.toUpperCase()}
                      </button>
                      {isOwner && !isUserOwner && (
                        <>
                          <hr className="my-1 border-border" />
                          <button
                            type="button"
                            onClick={() => {
                              setRoleMenuId(null);
                              setConfirmTransfer(user.memberId);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
                          >
                            <Crown className="h-3.5 w-3.5" />
                            {t.transferOwnership}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {canRemove && (
                <button
                  onClick={() => handleRemove(user.memberId)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Transfer ownership confirmation */}
              {confirmTransfer === user.memberId && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-card/95 backdrop-blur-sm">
                  <div className="text-center px-4">
                    <p className="text-sm font-medium text-foreground mb-3">{t.transferOwnershipDesc}</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setConfirmTransfer(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={() => handleTransferOwnership(user.memberId)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {t.transferOwnership}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
