import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupRole, MemberStatus } from "@prisma/client";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import JoinContent from "./join-content";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Block create mode: only admin/owner can create new parties
  if (mode === "create") {
    const activeMembership = await prisma.partyGroupMember.findFirst({
      where: { userId: user.id, status: MemberStatus.ACTIVE },
      include: { partyGroup: true },
    });
    const isAdmin = activeMembership?.role === GroupRole.ADMIN;
    const isOwner = activeMembership?.partyGroup.ownerId === user.id;
    if (!isAdmin && !isOwner) redirect("/dashboard");
  }

  // If user has pending memberships and not explicitly creating, show pending page
  if (mode !== "create") {
    const pendingCount = await prisma.partyGroupMember.count({
      where: { userId: user.id, status: MemberStatus.PENDING },
    });
    if (pendingCount > 0) redirect("/pending-approval");
  }

  // Check if user has active groups (show "back to dashboard" link if so)
  const activeGroupCount = await prisma.partyGroupMember.count({
    where: { userId: user.id, status: MemberStatus.ACTIVE },
  });
  const hasExistingGroups = activeGroupCount > 0;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

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
            {mode === "create" ? t.joinPartyTitle : t.waitForInviteTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "create" ? t.joinPartyDesc : t.waitForInvite}
          </p>
        </div>

        {mode === "create" && <JoinContent />}

        {hasExistingGroups && (
          <a
            href="/dashboard"
            className="mt-6 block text-center text-sm font-medium text-primary hover:text-primary/80"
          >
            {t.backToDashboard}
          </a>
        )}
      </div>
    </div>
  );
}
