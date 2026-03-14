"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n-context";

interface ProfileMenuProps {
  image: string | null;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
}

const roleBadge: Record<string, string> = {
  ADMIN: "bg-debt/10 text-debt",
  USER: "bg-muted text-muted-foreground",
};

const roleLabel: Record<string, string> = {
  ADMIN: "ADMIN",
  USER: "PASSENGER",
};

export default function ProfileMenu({ image, name, email, role, isAdmin }: ProfileMenuProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition hover:bg-accent"
      >
        {(role === "ADMIN" || role === "USER") && (
          <span className={`rounded-lg border border-border px-2 py-0.5 text-xs font-medium ${roleBadge[role]}`}>
            {roleLabel[role]}
          </span>
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
          {image ? (
            <img src={image} alt={name ?? ""} className="h-full w-full object-cover" />
          ) : (
            name?.charAt(0)?.toUpperCase() ?? "?"
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in">
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
