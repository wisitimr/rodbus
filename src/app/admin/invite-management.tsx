"use client";

import { useState } from "react";
import { Copy, Trash2, Plus, Check } from "lucide-react";
import { generateInviteLink, revokeInviteLink, deleteGroup, switchActiveGroup } from "@/lib/group-actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";
import { Users as UsersIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface InviteManagementProps {
  tokens: {
    id: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    isExpired: boolean;
  }[];
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export default function InviteManagement({ tokens, groupId, groupName, isOwner }: InviteManagementProps) {
  const { t, locale } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pickGroups, setPickGroups] = useState<{ id: string; name: string }[] | null>(null);

  const th = locale === "th";

  async function handleGenerate() {
    setLoading(true);
    try {
      await generateInviteLink(groupId, 7);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    if (!confirm(th ? "ยกเลิกลิงก์เชิญนี้?" : "Revoke this invite link?")) return;
    try {
      await revokeInviteLink(tokenId, groupId);
    } catch {
      // ignore
    }
  }

  async function handleCopy(tokenValue: string, tokenId: string) {
    const url = `${window.location.origin}/join/${tokenValue}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  const activeTokens = tokens.filter((t) => !t.isExpired);
  const expiredTokens = tokens.filter((t) => t.isExpired);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {th ? "ลิงก์เชิญ" : "Invite Links"}
        </h3>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {loading ? (th ? "กำลังสร้าง..." : "Creating...") : (th ? "สร้างลิงก์" : "Create Link")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {th
          ? `แชร์ลิงก์เชิญเพื่อให้คนอื่นขอเข้าร่วมกลุ่ม "${groupName}" ลิงก์หมดอายุใน 7 วัน`
          : `Share invite links so others can request to join "${groupName}". Links expire in 7 days.`}
      </p>

      {activeTokens.length === 0 && expiredTokens.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          {th ? "ยังไม่มีลิงก์เชิญ สร้างลิงก์ใหม่เพื่อเชิญสมาชิก" : "No invite links yet. Create one to invite members."}
        </p>
      )}

      {activeTokens.map((token) => {
        const joinUrl = typeof window !== "undefined"
          ? `${window.location.origin}/join/${token.token}`
          : `/join/${token.token}`;

        return (
          <div
            key={token.id}
            className="rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {th ? "หมดอายุ" : "Expires"}: {new Date(token.expiresAt).toLocaleDateString(th ? "th-TH" : "en-US")}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code — always visible */}
            <div className="border-t border-border px-4 pb-4 pt-3 text-center">
              <div className="mx-auto inline-block rounded-xl bg-white p-3">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
                <code className="text-xs text-muted-foreground select-all break-all">
                  {joinUrl}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(token.token, token.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {copiedId === token.id ? (
                    <Check className="h-3.5 w-3.5 text-settled" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {expiredTokens.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {th ? "หมดอายุแล้ว" : "Expired"}
          </h4>
          {expiredTokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3 opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  /join/{token.token}
                </p>
                <p className="text-xs text-muted-foreground">
                  {th ? "หมดอายุเมื่อ" : "Expired"}: {new Date(token.expiresAt).toLocaleDateString(th ? "th-TH" : "en-US")}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(token.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone — only visible to the party creator */}
      {isOwner && <div className="mt-6 rounded-xl border-2 border-debt/30 p-4">
        <h3 className="text-sm font-semibold text-debt">
          {th ? "ลบปาร์ตี้" : "Delete Party"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {th
            ? "ลบปาร์ตี้นี้และข้อมูลทั้งหมด รวมถึงสมาชิก ทริป และลิงก์เชิญ"
            : "Permanently delete this party and all its data, including members, trips, and invite links."}
        </p>

        {deleteError && <p className="mt-2 text-sm text-debt">{deleteError}</p>}

        {pickGroups ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">
              {th ? "เลือกปาร์ตี้ที่จะไปต่อ" : "Choose a party to switch to"}
            </p>
            {pickGroups.map((g) => (
              <button
                key={g.id}
                onClick={async () => {
                  await switchActiveGroup(g.id);
                  router.push("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-medium transition hover:bg-accent"
              >
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                {g.name}
              </button>
            ))}
          </div>
        ) : !confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-debt/30 py-2.5 text-sm font-medium text-debt transition hover:bg-debt/10"
          >
            <Trash2 className="h-4 w-4" />
            {th ? `ลบ "${groupName}"` : `Delete "${groupName}"`}
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-debt">
              {th ? "คุณแน่ใจหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้" : "Are you sure? This action cannot be undone."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                {th ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    const { remainingGroups } = await deleteGroup(groupId);
                    if (remainingGroups.length === 0) {
                      router.push("/join");
                    } else if (remainingGroups.length === 1) {
                      router.push("/");
                      router.refresh();
                    } else {
                      setPickGroups(remainingGroups);
                    }
                  } catch (e) {
                    setDeleteError(e instanceof Error ? e.message : "Failed to delete");
                    setConfirmDelete(false);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 rounded-xl bg-debt py-2.5 text-sm font-semibold text-white transition hover:bg-debt/90 disabled:opacity-50"
              >
                {deleting ? (th ? "กำลังลบ..." : "Deleting...") : (th ? "ยืนยันลบ" : "Confirm Delete")}
              </button>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
