"use client";

import { useState } from "react";
import { Users, Car, Settings } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface SettingsTabsProps {
  usersTab: React.ReactNode;
  carsTab: React.ReactNode;
  inviteTab: React.ReactNode;
}

export default function SettingsTabs({ usersTab, carsTab, inviteTab }: SettingsTabsProps) {
  const { t, locale } = useT();
  const [activeTab, setActiveTab] = useState<"users" | "cars" | "invite">("users");

  const th = locale === "th";

  const tabs = [
    { key: "users" as const, label: t.users, icon: Users },
    { key: "cars" as const, label: t.cars, icon: Car },
    { key: "invite" as const, label: th ? "ปาร์ตี้" : "Party", icon: Settings },
  ];

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === "users" && usersTab}
        {activeTab === "cars" && carsTab}
        {activeTab === "invite" && inviteTab}
      </div>
    </div>
  );
}
