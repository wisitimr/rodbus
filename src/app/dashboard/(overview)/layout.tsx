import { getCurrentUser } from "@/lib/auth";
import { headers } from "next/headers";
import { detectLocale, getTranslations } from "@/lib/i18n";
import { Home } from "lucide-react";
import ProfileMenu from "../profile-menu";
import { getActiveGroupOrRedirect, getGroupRole, getUserActiveGroups } from "@/lib/party-group";
import { GroupRole } from "@prisma/client";

export default async function OverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await getCurrentUser())!;

  const headersList = await headers();
  const locale = detectLocale(headersList.get("accept-language"));
  const t = getTranslations(locale);

  const activeGroupId = await getActiveGroupOrRedirect();
  const role = await getGroupRole(user.id, activeGroupId);
  const isAdmin = role === GroupRole.ADMIN;
  const groups = await getUserActiveGroups(user.id);
  const activeGroupName = groups.find((g) => g.id === activeGroupId)?.name;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                RodBus
                {activeGroupName && (
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                    · {activeGroupName}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.welcome}, {user.name ?? user.email}
              </p>
            </div>
          </div>
          <ProfileMenu
            image={user.image}
            name={user.name}
            email={user.email}
            role={isAdmin ? "ADMIN" : "MEMBER"}
            isAdmin={isAdmin}
            groups={groups}
            activeGroupId={activeGroupId}
          />
        </div>
      </header>
      {children}
    </>
  );
}
