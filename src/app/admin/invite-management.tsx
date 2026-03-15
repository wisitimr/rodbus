"use client";

import { useState } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { deleteGroup, switchActiveGroup } from "@/lib/group-actions";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";
import { Users as UsersIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface InviteManagementProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export default function InviteManagement({ groupId, groupName, isOwner }: InviteManagementProps) {
  const { locale } = useT();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pickGroups, setPickGroups] = useState<{ id: string; name: string }[] | null>(null);

  const th = locale === "th";

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${groupId}`
    : `/join/${groupId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = joinUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {/* QR Code Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm px-4 pb-4 pt-4">
        {/* Header */}
        <p className="text-sm text-muted-foreground mb-4">
          {th
            ? `แชร์ลิงก์เชิญเพื่อให้คนอื่นขอเข้าร่วม "${groupName}"`
            : `Share this link so others can request to join "${groupName}"`}
        </p>

        <div className="text-center">
        <div className="mx-auto rounded-xl border-2 border-dashed border-border bg-muted p-4">
          <QRCodeSVG
            value={joinUrl}
            size={200}
            level="H"
            className="mx-auto h-auto w-full max-w-[200px]"
          />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2">
          <code className="text-xs text-muted-foreground select-all break-all">
            {joinUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-settled" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        </div>
      </div>

      {/* Danger Zone — only visible to the party creator */}
      {isOwner && <div className="mt-6 rounded-xl border-2 border-debt/30 p-4">
        <h3 className="text-sm font-semibold text-debt">
          {th ? "ลบปาร์ตี้" : "Delete Party"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {th
            ? "ลบปาร์ตี้นี้และข้อมูลทั้งหมด รวมถึงสมาชิกและทริป"
            : "Permanently delete this party and all its data, including members and trips."}
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
