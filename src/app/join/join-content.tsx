"use client";

import { useState } from "react";
import { createGroup, joinViaInvite } from "@/lib/group-actions";
import { useRouter } from "next/navigation";

interface JoinContentProps {
  locale: string;
}

export default function JoinContent({ locale }: JoinContentProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<string | null>(null);

  const th = locale === "th";

  async function handleCreate() {
    if (!groupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createGroup(groupName);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Extract token from URL or use raw input
      let token = inviteCode.trim();
      const match = token.match(/\/join\/([^/?]+)/);
      if (match) token = match[1];

      const result = await joinViaInvite(token);
      if (result.status === "already_member") {
        router.push("/dashboard");
      } else if (result.status === "already_pending") {
        setJoinResult(th ? `คุณส่งคำขอเข้าร่วม "${result.groupName}" แล้ว` : `Already requested to join "${result.groupName}"`);
      } else {
        setJoinResult(th ? `ส่งคำขอเข้าร่วม "${result.groupName}" แล้ว รอแอดมินอนุมัติ` : `Requested to join "${result.groupName}". Waiting for admin approval.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  if (joinResult) {
    return (
      <div className="mt-6 rounded-xl border border-settled/30 bg-settled/5 p-4 text-center">
        <svg className="mx-auto h-8 w-8 text-settled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-sm font-medium text-foreground">{joinResult}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
        >
          {th ? "รีเฟรช" : "Refresh"}
        </button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {th ? "ชื่อกลุ่ม" : "Group Name"}
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={th ? "เช่น ทีม Office" : "e.g. Office Commute"}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-debt">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("choice"); setError(null); }}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            {th ? "กลับ" : "Back"}
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !groupName.trim()}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (th ? "กำลังสร้าง..." : "Creating...") : (th ? "สร้างกลุ่ม" : "Create Group")}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {th ? "ลิงก์เชิญหรือโค้ด" : "Invite Link or Code"}
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={th ? "วางลิงก์เชิญหรือโค้ดที่นี่" : "Paste invite link or code here"}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-debt">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("choice"); setError(null); }}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            {th ? "กลับ" : "Back"}
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim()}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (th ? "กำลังเข้าร่วม..." : "Joining...") : (th ? "เข้าร่วม" : "Join")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      <button
        onClick={() => setMode("create")}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-accent"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground">{th ? "สร้างกลุ่มใหม่" : "Create New Group"}</p>
          <p className="text-xs text-muted-foreground">{th ? "เริ่มต้นกลุ่มใหม่และเชิญสมาชิก" : "Start a new group and invite members"}</p>
        </div>
      </button>

      <button
        onClick={() => setMode("join")}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-accent"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-settled/10">
          <svg className="h-5 w-5 text-settled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.071a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.57" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-foreground">{th ? "เข้าร่วมด้วยลิงก์เชิญ" : "Join with Invite Link"}</p>
          <p className="text-xs text-muted-foreground">{th ? "ใช้ลิงก์เชิญจากแอดมิน" : "Use an invite link from a group admin"}</p>
        </div>
      </button>
    </div>
  );
}
