"use client";

import { useEffect, useState } from "react";
import { joinViaInvite } from "@/lib/group-actions";
import { useRouter } from "next/navigation";

interface JoinFormProps {
  token: string;
  groupName: string;
  th: boolean;
}

export default function JoinForm({ token, groupName, th }: JoinFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "joining" | "pending" | "already" | "error">("idle");

  async function handleJoin() {
    setStatus("joining");
    try {
      const result = await joinViaInvite(token);
      if (result.status === "already_member") {
        router.push("/dashboard");
      } else {
        router.push("/pending-approval");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "pending") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground">{th ? "รอการอนุมัติ" : "Awaiting Approval"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {th
            ? `คำขอเข้าร่วม "${groupName}" ถูกส่งแล้ว รอแอดมินอนุมัติ`
            : `Your request to join "${groupName}" has been sent. Waiting for admin approval.`}
        </p>
        <a href="/join" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/80">
          {th ? "กลับ" : "Go back"}
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-foreground">
        {th ? `เข้าร่วม "${groupName}"` : `Join "${groupName}"`}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {th ? "คุณได้รับเชิญให้เข้าร่วมปาร์ตี้นี้" : "You've been invited to join this party."}
      </p>

      {status === "error" && (
        <p className="mt-2 text-sm text-debt">{th ? "เกิดข้อผิดพลาด ลองอีกครั้ง" : "Something went wrong. Please try again."}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={status === "joining"}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {status === "joining"
          ? (th ? "กำลังเข้าร่วม..." : "Joining...")
          : (th ? "ขอเข้าร่วม" : "Request to Join")}
      </button>
      <a href="/join" className="mt-3 inline-block text-sm font-medium text-muted-foreground hover:text-foreground">
        {th ? "ยกเลิก" : "Cancel"}
      </a>
    </div>
  );
}
