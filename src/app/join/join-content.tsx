"use client";

import { useState } from "react";
import { createGroup } from "@/lib/group-actions";
import { useRouter } from "next/navigation";

interface JoinContentProps {
  locale: string;
  initialMode?: "choice" | "create";
}

export default function JoinContent({ locale, initialMode = "choice" }: JoinContentProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "create">(initialMode);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const th = locale === "th";

  async function handleCreate() {
    if (!groupName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createGroup(groupName);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create party");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "create") {
    return (
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {th ? "ชื่อปาร์ตี้" : "Party Name"}
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
            {loading ? (th ? "กำลังสร้าง..." : "Creating...") : (th ? "สร้างปาร์ตี้" : "Create Party")}
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
          <p className="font-semibold text-foreground">{th ? "สร้างปาร์ตี้ใหม่" : "Create New Party"}</p>
          <p className="text-xs text-muted-foreground">{th ? "เริ่มต้นปาร์ตี้ใหม่และเชิญสมาชิก" : "Start a new party and invite members"}</p>
        </div>
      </button>
    </div>
  );
}
