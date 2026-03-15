"use client";

import { useState } from "react";
import { Copy, Trash2, Plus, Check } from "lucide-react";
import { generateInviteLink, revokeInviteLink } from "@/lib/group-actions";
import { useT } from "@/lib/i18n-context";

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
}

export default function InviteManagement({ tokens, groupId, groupName }: InviteManagementProps) {
  const { t, locale } = useT();
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

      {activeTokens.map((token) => (
        <div
          key={token.id}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-foreground">
              /join/{token.token}
            </p>
            <p className="text-xs text-muted-foreground">
              {th ? "หมดอายุ" : "Expires"}: {new Date(token.expiresAt).toLocaleDateString(th ? "th-TH" : "en-US")}
            </p>
          </div>
          <button
            onClick={() => handleCopy(token.token, token.id)}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {copiedId === token.id ? <Check className="h-4 w-4 text-settled" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handleRevoke(token.id)}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-debt/10 hover:text-debt"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

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
    </div>
  );
}
