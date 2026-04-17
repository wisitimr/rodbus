import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import RodBusLogo, { RodBusWordmark } from "@/components/rodbus-logo";
import ProfileMenu from "../profile-menu";
import { GroupRole } from "@prisma/client";

export default async function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeMembership) redirect("/join");

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const { user, activeMembership } = ctx;
  const activeGroupName = activeMembership.partyGroup.name;
  const isOwner = activeMembership.partyGroup.ownerId === user.id;
  const isAdmin = isOwner || activeMembership.role === GroupRole.ADMIN;
  const groups = ctx.memberships.map((m) => ({
    id: m.partyGroup.id,
    name: m.partyGroup.name,
    role: m.role,
    ownerId: m.partyGroup.ownerId,
  }));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <RodBusLogo className="h-9 w-9" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <RodBusWordmark className="text-2xl" />
                {activeGroupName && (
                  <span className="text-sm font-medium text-muted-foreground">
                    · {activeGroupName}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.welcome}, {user.name ?? user.email}
              </p>
            </div>
          </div>
          <ProfileMenu
            image={user.image}
            name={user.name}
            email={user.email}
            role={isOwner ? "OWNER" : isAdmin ? "ADMIN" : "MEMBER"}
            isAdmin={isAdmin}
            groups={groups}
            activeGroupId={activeMembership.partyGroupId}
          />
        </div>
      </header>
      {children}
    </>
  );
}
