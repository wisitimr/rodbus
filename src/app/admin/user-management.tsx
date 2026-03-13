"use client";

import { useState, useRef, useEffect } from "react";
import { approveUser, deleteUser, setUserRole } from "@/lib/admin-actions";
import { useT } from "@/lib/i18n-context";
import type { Role } from "@prisma/client";

interface UserManagementProps {
  users: { id: string; name: string | null; email: string; role: Role }[];
  currentUserId: string;
}

const avatarColors: Record<string, string> = {
  A: "bg-red-100 text-red-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-green-100 text-green-700",
  D: "bg-purple-100 text-purple-700",
  E: "bg-pink-100 text-pink-700",
  F: "bg-indigo-100 text-indigo-700",
  G: "bg-yellow-100 text-yellow-700",
  H: "bg-teal-100 text-teal-700",
  I: "bg-orange-100 text-orange-700",
  J: "bg-cyan-100 text-cyan-700",
  K: "bg-rose-100 text-rose-700",
  L: "bg-amber-100 text-amber-700",
  M: "bg-lime-100 text-lime-700",
  N: "bg-yellow-200 text-yellow-800",
  O: "bg-emerald-100 text-emerald-700",
  P: "bg-sky-100 text-sky-700",
  Q: "bg-violet-100 text-violet-700",
  R: "bg-fuchsia-100 text-fuchsia-700",
  S: "bg-blue-100 text-blue-700",
  T: "bg-teal-100 text-teal-700",
};

function getAvatarColor(name: string | null) {
  const initial = (name || "?")[0].toUpperCase();
  return avatarColors[initial] || "bg-gray-100 text-gray-700";
}

function getInitial(name: string | null) {
  return (name || "?")[0].toUpperCase();
}

const roleBadgeStyle: Record<string, string> = {
  USER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-red-100 text-red-700",
};

export default function UserManagement({ users, currentUserId }: UserManagementProps) {
  const { t } = useT();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAnyLoading = loadingAction !== null;
  const pendingUsers = users.filter((u) => u.role === "PENDING");
  const activeUsers = users.filter((u) => u.role !== "PENDING");

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

  async function handleApprove(userId: string) {
    setLoadingAction(`approve-${userId}`);
    try {
      await approveUser(userId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm(t.confirmDeleteUser)) return;
    setLoadingAction(`delete-${userId}`);
    try {
      await deleteUser(userId);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    setRoleMenuId(null);
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

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-yellow-600">
            {t.pendingApproval} ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50/50 px-4 py-3"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getAvatarColor(user.name)} text-sm font-bold`}>
                  {getInitial(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{user.name ?? t.noName}</p>
                  <p className="truncate text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={isAnyLoading}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.approve}
                  {loadingAction === `approve-${user.id}` && "..."}
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={isAnyLoading}
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
          {t.allUsersLabel} ({activeUsers.length})
        </h3>
        <div className="space-y-3">
          {activeUsers.map((user) => {
            const isMe = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getAvatarColor(user.name)} text-sm font-bold`}>
                  {getInitial(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-gray-900">{user.name ?? t.noName}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${roleBadgeStyle[user.role] || "bg-gray-100 text-gray-700"}`}>
                      {user.role === "ADMIN" ? t.admin.toUpperCase() : t.passenger.toUpperCase()}
                    </span>
                  </div>
                  <p className="truncate text-sm text-gray-500">{user.email}</p>
                </div>
                {!isMe && (
                  <div className="relative shrink-0" ref={roleMenuId === user.id ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setRoleMenuId(roleMenuId === user.id ? null : user.id)}
                      disabled={isAnyLoading}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    </button>
                    {roleMenuId === user.id && (
                      <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleRoleChange(user.id, "USER" as Role)}
                          className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-gray-50 ${user.role === "USER" ? "font-semibold text-blue-600" : "text-gray-700"}`}
                        >
                          {t.passenger.toUpperCase()}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoleChange(user.id, "ADMIN" as Role)}
                          className={`flex w-full items-center border-t border-gray-100 px-4 py-2.5 text-sm transition hover:bg-gray-50 ${user.role === "ADMIN" ? "font-semibold text-blue-600" : "text-gray-700"}`}
                        >
                          ADMIN
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!isMe && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={isAnyLoading}
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
