"use client";

import { useState } from "react";
import { approveUser, revokeUser, setUserRole } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import type { Role } from "@prisma/client";

interface UserManagementProps {
  users: { id: string; name: string | null; email: string; role: Role }[];
  currentUserId: string;
}

const PAGE_SIZE = 5;

const roleBadge: Record<Role, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  USER: "bg-green-100 text-green-800",
  ADMIN: "bg-red-100 text-red-800",
};

const roleLabel: Record<Role, string> = {
  PENDING: "Pending",
  USER: "Passenger",
  ADMIN: "Admin",
};

export default function UserManagement({ users, currentUserId }: UserManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [pendingVisible, setPendingVisible] = useState(PAGE_SIZE);
  const [activeVisible, setActiveVisible] = useState(PAGE_SIZE);

  function toggleUser(id: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove(userId: string) {
    setLoadingAction(`approve-${userId}`);
    try {
      await approveUser(userId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRevoke(userId: string) {
    setLoadingAction(`revoke-${userId}`);
    try {
      await revokeUser(userId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    setLoadingAction(`role-${userId}`);
    try {
      const result = await setUserRole(userId, newRole);
      if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  const isAnyLoading = loadingAction !== null;
  const pendingUsers = users.filter((u) => u.role === "PENDING");
  const activeUsers = users.filter((u) => u.role !== "PENDING");

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-yellow-700">
            {t.pendingApproval} ({pendingUsers.length})
          </h3>
          <ul className="space-y-2">
            {pendingUsers.slice(0, pendingVisible).map((user) => (
              <li
                key={user.id}
                className="rounded-xl bg-yellow-50"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name ?? t.noName}</p>
                    <p className="truncate text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={isAnyLoading}
                    className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    {t.approve}{loadingAction === `approve-${user.id}` && "..."}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pendingVisible < pendingUsers.length && (
            <button
              type="button"
              onClick={() => setPendingVisible((v) => v + PAGE_SIZE)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {t.loadMore}
            </button>
          )}
        </div>
      )}

      {pendingUsers.length === 0 && (
        <p className="text-sm text-gray-500">{t.noPendingUsers}</p>
      )}

      {/* Active Users */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-600">
          {t.activeUsers} ({activeUsers.length})
        </h3>
        <ul className="space-y-2">
          {activeUsers.slice(0, activeVisible).map((user) => {
            const isMe = user.id === currentUserId;
            const isExpanded = expandedUsers.has(user.id);
            return (
              <li key={user.id} className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name ?? t.noName}</p>
                      <p className="truncate text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${roleBadge[user.role]}`}
                    >
                      {roleLabel[user.role]}
                    </span>
                  </div>
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className="shrink-0 text-gray-400"
                    >
                      <svg
                        className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  )}
                </div>

                {isExpanded && !isMe && (
                  <div className="mt-2 flex gap-2 border-t border-gray-100 pt-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      disabled={isAnyLoading}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-50"
                    >
                      <option value="USER">Passenger</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {user.role === "USER" && (
                      <button
                        onClick={() => handleRevoke(user.id)}
                        disabled={isAnyLoading}
                        className="flex-1 rounded-lg border border-red-300 py-1.5 text-sm text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                      >
                        {t.revoke}{loadingAction === `revoke-${user.id}` && "..."}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {activeVisible < activeUsers.length && (
          <button
            type="button"
            onClick={() => setActiveVisible((v) => v + PAGE_SIZE)}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            {t.loadMore}
          </button>
        )}
      </div>
    </div>
  );
}
