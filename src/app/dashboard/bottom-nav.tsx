"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Clock, Settings } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface BottomNavProps {
  isAdmin: boolean;
  hasCars: boolean;
  hasTrips: boolean;
}

export default function BottomNav({ isAdmin, hasCars, hasTrips }: BottomNavProps) {
  const { t } = useT();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending state when pathname catches up
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function isActive(href: string) {
    if (pendingHref) return href === pendingHref;
    if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
    return pathname === href;
  }

  const tabs = [
    { label: t.dashboard, href: "/dashboard", icon: Home },
    ...(isAdmin && hasCars
      ? [{ label: t.manage, href: "/manage", icon: ClipboardList }]
      : []),
    ...(hasTrips
      ? [{ label: t.history, href: "/dashboard/history", icon: Clock }]
      : []),
    ...(isAdmin
      ? [{ label: t.settings, href: "/admin", icon: Settings }]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              onClick={() => {
                if (pathname !== tab.href) setPendingHref(tab.href);
              }}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span>{tab.label}</span>
              {active && (
                <div className="mt-0.5 h-1 w-5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
