import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import JoinTokenContent from "./join-token-content";

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
          <a href="/join" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/80">
            {th ? "กลับไปหน้าเข้าร่วม" : "Back to join page"}
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
          <a href="/join" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/80">
            {th ? "กลับไปหน้าเข้าร่วม" : "Back to join page"}
          </a>
        </div>
      </div>
    );
  }

  // Check if user is already a member
  const existing = await prisma.partyGroupMember.findUnique({
    where: {
      userId_partyGroupId: { userId: user.id, partyGroupId: inviteToken.partyGroupId },
    },
  });

  if (existing?.status === MemberStatus.ACTIVE) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center animate-scale-in">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
          <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {inviteToken.partyGroup.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {th ? "คุณได้รับเชิญเข้าร่วมกลุ่มนี้" : "You've been invited to join this group"}
        </p>

        <JoinTokenContent
          token={token}
          groupName={inviteToken.partyGroup.name}
          isPending={existing?.status === MemberStatus.PENDING}
          locale={locale}
        />
      </div>
    </div>
  );
}
