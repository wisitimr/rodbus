"use client";

import { usePathname } from "next/navigation";
import { Home, ClipboardList, Clock, Settings } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface BottomNavProps {
  isAdmin: boolean;
}

export default function BottomNav({ isAdmin }: BottomNavProps) {
  const { t } = useT();
  const pathname = usePathname();

  const tabs = [
    {
      label: t.dashboard,
      href: "/dashboard",
      active: pathname === "/dashboard",
      icon: Home,
    },
    ...(isAdmin
      ? [
          {
            label: t.manage,
            href: "/manage",
            active: pathname === "/manage",
            icon: ClipboardList,
          },
        ]
      : []),
    {
      label: t.history,
      href: "/dashboard/history",
      active: pathname === "/dashboard/history",
      icon: Clock,
    },
    ...(isAdmin
      ? [
          {
            label: t.settings,
            href: "/admin",
            active: pathname === "/admin" || pathname.startsWith("/admin/"),
            icon: Settings,
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <a
              key={tab.href + tab.label}
              href={tab.href}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                tab.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${tab.active ? "stroke-[2.5]" : ""}`} />
              <span>{tab.label}</span>
              {tab.active && (
                <div className="mt-0.5 h-1 w-5 rounded-full bg-primary" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
