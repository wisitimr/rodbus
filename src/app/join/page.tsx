import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import { SignOutButton } from "@clerk/nextjs";
import JoinContent from "./join-content";

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Check if user has active groups (show "back to dashboard" link if so)
  const activeGroups = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
    include: { partyGroup: { select: { name: true } } },
  });

  const hasExistingGroups = activeGroups.length > 0;

  // Check pending memberships
  const pendingMemberships = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.PENDING },
    include: { partyGroup: { select: { name: true } } },
  });

  const hasPending = pendingMemberships.length > 0;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const th = locale === "th";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center">
          <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 ${hasPending ? "bg-warning/10 border-warning/30" : "bg-primary/10 border-primary/30"}`}>
            {hasPending ? (
              <svg className="h-12 w-12 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {hasPending
              ? (th ? "รอการอนุมัติ" : "Pending Approval")
              : (th ? "เข้าร่วมปาร์ตี้" : "Join a Party")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasPending
              ? (th ? "คำขอเข้าร่วมของคุณกำลังรอแอดมินอนุมัติ" : "Your join request is waiting for admin approval")
              : (th ? "สร้างปาร์ตี้ใหม่และเชิญสมาชิก" : "Create a new party and invite members")}
          </p>
        </div>

        {pendingMemberships.length > 0 && (
          <div className="mt-6 space-y-2">
            {!hasPending && (
              <h3 className="text-sm font-semibold uppercase tracking-wider text-warning">
                {th ? "รอการอนุมัติ" : "Pending Approval"}
              </h3>
            )}
            {pendingMemberships.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border-2 border-warning/30 bg-warning/5 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20">
                  <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{m.partyGroup.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {th ? "รอแอดมินอนุมัติ" : "Waiting for admin approval"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasPending && <JoinContent locale={locale} />}

        {hasPending && (
          <div className="mt-6 space-y-3">
            {hasExistingGroups ? (
              <a
                href="/dashboard"
                className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {th ? "ไปแดชบอร์ด" : "Go to Dashboard"}
              </a>
            ) : (
              <SignOutButton>
                <button className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted">
                  {th ? "ออกจากระบบ" : "Sign Out"}
                </button>
              </SignOutButton>
            )}
          </div>
        )}

        {!hasPending && hasExistingGroups && (
          <a
            href="/dashboard"
            className="mt-6 block text-center text-sm font-medium text-primary hover:text-primary/80"
          >
            {th ? "← กลับไปแดชบอร์ด" : "← Back to Dashboard"}
          </a>
        )}
      </div>
    </div>
  );
}
