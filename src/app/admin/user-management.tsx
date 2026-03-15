"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Trash2, UserRoundCog, X } from "lucide-react";
import { approveJoinRequest, rejectJoinRequest, removeGroupMember, setGroupMemberRole } from "@/lib/group-actions";
import { useT } from "@/lib/i18n-context";
import type { GroupRole, MemberStatus } from "@prisma/client";

interface UserManagementProps {
  users: {
    memberId: string;
    id: string;
    name: string | null;
    email: string;
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
};

export default function UserManagement({ users, currentUserId, groupId, ownerId }: UserManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-sm font-bold text-warning">
                  {initial}
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
          const initial = (user.name || "?")[0].toUpperCase();
          const badge = roleBadgeStyle[user.role] || "bg-muted text-muted-foreground";
          const isLoading = loadingAction === `remove-${user.memberId}` || loadingAction === `role-${user.memberId}`;
          return (
            <div
              key={user.memberId}
              className={`relative flex items-center gap-3 rounded-xl border border-border bg-card p-3 animate-fade-in transition-opacity ${isLoading ? "animate-pulse opacity-50 pointer-events-none" : ""}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{user.name ?? t.noName}</p>
                  <span className={`shrink-0 rounded-lg border border-border px-2 py-0.5 text-xs font-medium ${badge}`}>
                    {user.role === "ADMIN" ? t.admin.toUpperCase() : t.passenger.toUpperCase()}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              {!isMe && user.id !== ownerId && (
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
                    <div className="absolute right-0 z-10 mt-1 w-32 rounded-xl border border-border bg-card p-1.5 shadow-lg animate-fade-in">
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.memberId, "MEMBER" as GroupRole)}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent ${user.role === "MEMBER" ? "text-primary" : "text-foreground"}`}
                      >
                        {t.passenger.toUpperCase()}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange(user.memberId, "ADMIN" as GroupRole)}
                        className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent ${user.role === "ADMIN" ? "text-primary" : "text-foreground"}`}
                      >
                        {t.admin.toUpperCase()}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isMe && user.id !== ownerId && (
                <button
                  onClick={() => handleRemove(user.memberId)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
