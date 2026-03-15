import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import { SignOutButton } from "@clerk/nextjs";

export default async function PendingApprovalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [activeGroups, pendingMemberships] = await Promise.all([
    prisma.partyGroupMember.findMany({
      where: { userId: user.id, status: MemberStatus.ACTIVE },
    }),
    prisma.partyGroupMember.findMany({
      where: { userId: user.id, status: MemberStatus.PENDING },
      include: { partyGroup: { select: { name: true } } },
    }),
  ]);

  // No pending memberships — go to join or dashboard
  if (pendingMemberships.length === 0) {
    redirect(activeGroups.length > 0 ? "/dashboard" : "/join");
  }

  const hasExistingGroups = activeGroups.length > 0;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const th = locale === "th";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 bg-warning/10 border-warning/30">
            <svg className="h-12 w-12 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {th ? "รอการอนุมัติ" : "Pending Approval"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {th ? "คำขอเข้าร่วมของคุณกำลังรอแอดมินอนุมัติ" : "Your join request is waiting for admin approval"}
          </p>
        </div>

        <div className="mt-6 space-y-2">
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
      </div>
    </div>
  );
}
