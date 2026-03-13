"use client";

import { useState, useRef, useEffect } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n-context";

interface ProfileMenuProps {
  image: string | null;
  name: string | null;
  email: string;
  role: string;
  isAdmin: boolean;
}

const roleLabel: Record<string, string> = {
  ADMIN: "ADMIN",
  USER: "PASSENGER",
};

const roleBadge: Record<string, string> = {
  ADMIN: "bg-red-50 text-red-600 ring-red-500/20",
  USER: "bg-gray-100 text-gray-500 ring-gray-300/50",
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
        className="flex items-center gap-2.5 rounded-full py-1 pl-3 pr-1 transition hover:bg-gray-100"
      >
        {(role === "ADMIN" || role === "USER") && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${roleBadge[role]}`}>
            {roleLabel[role]}
          </span>
        )}
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-gray-200">
          {image ? (
            <img src={image} alt={name ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-900 text-sm font-medium text-white">
              {name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
          <SignOutButton>
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              {t.signOut}
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
