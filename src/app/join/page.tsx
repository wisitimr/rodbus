import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import JoinContent from "./join-content";

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Check if user already has active groups
  const activeGroups = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
    include: { partyGroup: { select: { name: true } } },
  });

  if (activeGroups.length > 0) {
    redirect("/dashboard");
  }

  // Check pending memberships
  const pendingMemberships = await prisma.partyGroupMember.findMany({
    where: { userId: user.id, status: MemberStatus.PENDING },
    include: { partyGroup: { select: { name: true } } },
  });

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
            <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {locale === "th" ? "เข้าร่วมกลุ่ม" : "Join a Group"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "th"
              ? "สร้างกลุ่มใหม่หรือเข้าร่วมกลุ่มที่มีอยู่ด้วยลิงก์เชิญ"
              : "Create a new group or join an existing one with an invite link"}
          </p>
        </div>

        {pendingMemberships.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-warning">
              {locale === "th" ? "รอการอนุมัติ" : "Pending Approval"}
            </h3>
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
                    {locale === "th" ? "รอแอดมินอนุมัติ" : "Waiting for admin approval"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <JoinContent locale={locale} />
      </div>
    </div>
  );
}
