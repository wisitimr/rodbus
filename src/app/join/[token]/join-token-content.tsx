"use client";

import { useState } from "react";
import { joinViaInvite } from "@/lib/group-actions";

interface JoinTokenContentProps {
  token: string;
  groupName: string;
  isPending: boolean;
  locale: string;
}

export default function JoinTokenContent({ token, groupName, isPending, locale }: JoinTokenContentProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(isPending ? "pending" : null);
  const [error, setError] = useState<string | null>(null);

  const th = locale === "th";

  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      const result = await joinViaInvite(token);
      if (result.status === "already_member") {
        window.location.href = "/dashboard";
      } else {
        setStatus("pending");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  if (status === "pending") {
    return (
      <div className="mt-6 rounded-xl border-2 border-warning/30 bg-warning/5 p-4">
        <svg className="mx-auto h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm font-medium text-foreground">
          {th ? "รอแอดมินอนุมัติ" : "Waiting for admin approval"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {th
            ? `คำขอเข้าร่วม "${groupName}" ถูกส่งแล้ว แอดมินจะอนุมัติเร็วๆ นี้`
            : `Your request to join "${groupName}" has been submitted. An admin will approve it soon.`}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && <p className="text-sm text-debt">{error}</p>}
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading
          ? (th ? "กำลังส่งคำขอ..." : "Requesting...")
          : (th ? "ขอเข้าร่วมกลุ่ม" : "Request to Join")}
      </button>
      <a
        href="/join"
        className="block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {th ? "กลับ" : "Back"}
      </a>
    </div>
  );
}
