import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import { joinViaInvite } from "@/lib/group-actions";

export default async function JoinTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const th = locale === "th";

  const inviteToken = await prisma.inviteToken.findUnique({
    where: { token },
    include: { partyGroup: { select: { id: true, name: true } } },
  });

  if (!inviteToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-debt/10">
            <svg className="h-8 w-8 text-debt" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">{th ? "ลิงก์ไม่ถูกต้อง" : "Invalid Link"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{th ? "ลิงก์เชิญนี้ไม่ถูกต้องหรือถูกยกเลิกแล้ว" : "This invite link is invalid or has been revoked."}</p>
          <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/80">
            {th ? "กลับไปแดชบอร์ด" : "Back to Dashboard"}
          </a>
        </div>
      </div>
    );
  }

  if (inviteToken.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">{th ? "ลิงก์หมดอายุ" : "Link Expired"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{th ? "ลิงก์เชิญนี้หมดอายุแล้ว ขอลิงก์ใหม่จากแอดมิน" : "This invite link has expired. Ask the admin for a new one."}</p>
          <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/80">
            {th ? "กลับไปแดชบอร์ด" : "Back to Dashboard"}
          </a>
        </div>
      </div>
    );
  }

  // Auto-join: call joinViaInvite server-side
  const result = await joinViaInvite(token);

  if (result.status === "already_member") {
    redirect("/dashboard");
  }

  // Pending approval (new request or already pending)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-warning/10 border-2 border-warning/30">
          <svg className="h-12 w-12 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {inviteToken.partyGroup.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {th ? "คุณได้รับเชิญเข้าร่วมปาร์ตี้นี้" : "You've been invited to join this party"}
        </p>
        <div className="mt-6 rounded-xl border-2 border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-medium text-foreground">
            {th ? "รอแอดมินอนุมัติ" : "Waiting for admin approval"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {th
              ? `คำขอเข้าร่วม "${inviteToken.partyGroup.name}" ถูกส่งแล้ว แอดมินจะอนุมัติเร็วๆ นี้`
              : `Your request to join "${inviteToken.partyGroup.name}" has been submitted. An admin will approve it soon.`}
          </p>
        </div>
        <a
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary/80"
        >
          {th ? "กลับไปแดชบอร์ด" : "Back to Dashboard"}
        </a>
      </div>
    </div>
  );
}
