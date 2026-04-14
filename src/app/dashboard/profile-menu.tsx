"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, Check, Plus, Crown, UserCog } from "lucide-react";
import Link from "next/link";
import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import { useT } from "@/lib/i18n-context";
import { switchActiveGroup } from "@/lib/group-actions";
import { syncClerkProfile } from "@/lib/user-actions";
import { useRouter } from "next/navigation";

interface GroupInfo {
  id: string;
  name: string;
  role: string;
}

interface ProfileMenuProps {
  image: string | null;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
  groups?: GroupInfo[];
  activeGroupId?: string;
}

const roleBadge: Record<string, string> = {
  OWNER: "bg-primary/10 text-primary",
  ADMIN: "bg-debt/10 text-debt",
  MEMBER: "bg-muted text-muted-foreground",
};


export default function ProfileMenu({ image, name, email, role, isAdmin, groups, activeGroupId }: ProfileMenuProps) {
  const { t } = useT();
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const { user: clerkUser, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const roleLabel: Record<string, string> = {
    OWNER: t.partyOwner.toUpperCase(),
    ADMIN: t.coHost.toUpperCase(),
    MEMBER: t.member.toUpperCase(),
  };
  const menuRef = useRef<HTMLDivElement>(null);

  // Prefer live Clerk data so name/image update immediately after Clerk edits
  const displayImage = isLoaded && clerkUser ? clerkUser.imageUrl : image;
  const displayName = isLoaded && clerkUser ? (clerkUser.fullName ?? clerkUser.firstName ?? name) : name;

  // When the Clerk profile diverges from what's in the DB (the `image`/`name`
  // props reflect the server-side DB state), sync it back so other views
  // (group member lists, trip cards, etc.) also see the update.
  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    const clerkName = clerkUser.fullName ?? clerkUser.firstName ?? null;
    if (clerkUser.imageUrl !== image || clerkName !== name) {
      syncClerkProfile()
        .then(() => router.refresh())
        .catch((err) => console.error("Failed to sync profile:", err));
    }
  }, [isLoaded, clerkUser, image, name, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleManageAccount() {
    setOpen(false);
    openUserProfile();
  }

  async function handleSwitchGroup(groupId: string) {
    await switchActiveGroup(groupId);
    setOpen(false);
    router.refresh();
  }

  const activeGroup = groups?.find((g) => g.id === activeGroupId);
  const hasMultipleGroups = groups && groups.length > 1;

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition hover:bg-accent"
      >
        {(role === "OWNER" || role === "ADMIN" || role === "MEMBER") && (
          <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${roleBadge[role] ?? roleBadge.MEMBER}`}>
            {role === "OWNER" && <Crown className="h-3 w-3" />}
            {roleLabel[role] ?? role}
          </span>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
          {displayImage ? (
            <img src={displayImage} alt={displayName ?? ""} className="h-full w-full object-cover" />
          ) : (
            displayName?.charAt(0)?.toUpperCase() ?? "?"
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in">
          {/* Group switcher */}
          {hasMultipleGroups && (
            <>
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.parties}
                </p>
              </div>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSwitchGroup(group.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent"
                >
                  {group.id === activeGroupId ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span className={group.id === activeGroupId ? "font-semibold text-primary" : ""}>
                    {group.name}
                  </span>
                  <span className={`ml-auto text-xs ${group.role === "ADMIN" ? "text-debt" : "text-muted-foreground"}`}>
                    {roleLabel[group.role] ?? group.role}
                  </span>
                </button>
              ))}
              <div className="border-t border-border" />
            </>
          )}

          {/* Active group name (single group) */}
          {!hasMultipleGroups && activeGroup && (
            <>
              <div className="border-b border-border px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.party}
                </p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-sm font-semibold text-foreground">{activeGroup.name}</p>
              </div>
              <div className="border-t border-border" />
            </>
          )}

          {isAdmin && (
            <Link
              href="/join?mode=create"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              {t.createGroup}
            </Link>
          )}
          <div className="border-t border-border" />
          <button
            onClick={handleManageAccount}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent"
          >
            <UserCog className="h-4 w-4 text-muted-foreground" />
            {t.manageAccount}
          </button>
          <SignOutButton>
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition hover:bg-accent">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              {t.signOut}
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
