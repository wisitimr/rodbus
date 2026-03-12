"use client";

import { useState, useRef, useEffect } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n-context";

interface ProfileMenuProps {
  image: string | null;
  name: string | null;
  isAdmin: boolean;
}

export default function ProfileMenu({ image, name, isAdmin }: ProfileMenuProps) {
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
        className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-gray-200 transition hover:ring-gray-400"
      >
        {image ? (
          <img src={image} alt={name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-900 text-sm font-medium text-white">
            {name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
          {isAdmin && (
            <a
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              {t.settings}
            </a>
          )}
          <SignOutButton>
            <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50">
              {t.signOut}
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
