import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { detectLocale } from "@/lib/i18n";
import JoinForm from "./join-form";

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const th = locale === "th";

  const group = await prisma.partyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });

  if (!group) {
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
            {th ? "กลับ" : "Go back"}
          </a>
        </div>
      </div>
    );
  }

  // Check if already a member
  const existing = await prisma.partyGroupMember.findUnique({
    where: {
      userId_partyGroupId: { userId: user.id, partyGroupId: group.id },
    },
  });

  if (existing?.status === "ACTIVE") {
    redirect("/dashboard");
  }

  if (existing?.status === "PENDING") {
    redirect("/pending-approval");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <JoinForm groupId={group.id} groupName={group.name} th={th} />
      </div>
    </div>
  );
}
