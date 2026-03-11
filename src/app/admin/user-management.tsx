"use client";

import { useTransition } from "react";
import { approveUser, revokeUser, setUserRole } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import type { Role } from "@prisma/client";

interface UserManagementProps {
  users: { id: string; name: string | null; email: string; role: Role }[];
  currentUserId: string;
}

const roleBadge: Record<Role, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  USER: "bg-green-100 text-green-800",
  ADMIN: "bg-red-100 text-red-800",
};

export default function UserManagement({ users, currentUserId }: UserManagementProps) {
  const { t } = useT();
  const [isPending, startTransition] = useTransition();

  function handleApprove(userId: string) {
    startTransition(async () => {
      await approveUser(userId);
    });
  }

  function handleRevoke(userId: string) {
    startTransition(async () => {
      await revokeUser(userId);
    });
  }

  function handleRoleChange(userId: string, newRole: Role) {
    startTransition(async () => {
      await setUserRole(userId, newRole);
    });
  }

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
            {pendingUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-yellow-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name ?? t.noName}</p>
                  <p className="truncate text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={isPending}
                  className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {t.approve}
                </button>
              </li>
            ))}
          </ul>
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
          {activeUsers.map((user) => (
            <li
              key={user.id}
              className="rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name ?? t.noName}</p>
                    <p className="truncate text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[user.role]}`}
                  >
                    {user.role}
                  </span>
                </div>
                {user.id !== currentUserId && (
                  <div className="flex shrink-0 items-center gap-2">
                    {user.role === "USER" && (
                      <button
                        onClick={() => handleRevoke(user.id)}
                        disabled={isPending}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                      >
                        {t.revoke}
                      </button>
                    )}
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      disabled={isPending}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm disabled:opacity-50"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
