"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldOff, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n-context";

function TapResult() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const car = searchParams.get("car");
  const reason = searchParams.get("reason");

  const messages: Record<
    string,
    { title: string; description: string; icon: React.ReactNode; iconBg: string; iconBorder: string; titleColor: string }
  > = {
    recorded: {
      title: t.checkedIn,
      description: `${t.checkInRecorded} ${car ?? "the car"} ${t.checkInRecordedSuffix}`,
      icon: <CheckCircle2 className="h-14 w-14 text-settled" />,
      iconBg: "bg-settled/10",
      iconBorder: "border-settled/30",
      titleColor: "text-settled",
    },
    already_recorded: {
      title: t.alreadyRecorded,
      description: `${car ?? "the car"} ${t.alreadyRecordedDesc}`,
      icon: <AlertTriangle className="h-14 w-14 text-warning" />,
      iconBg: "bg-warning/10",
      iconBorder: "border-warning/30",
      titleColor: "text-warning",
    },
    no_open_trip: {
      title: t.noOpenTrip,
      description: t.noOpenTripDesc,
      icon: <XCircle className="h-14 w-14 text-muted-foreground" />,
      iconBg: "bg-muted",
      iconBorder: "border-border",
      titleColor: "text-muted-foreground",
    },
    owner: {
      title: t.ownerCannotCheckIn,
      description: t.ownerCannotCheckInDesc,
      icon: <AlertTriangle className="h-14 w-14 text-primary" />,
      iconBg: "bg-primary/10",
      iconBorder: "border-primary/30",
      titleColor: "text-primary",
    },
    no_group: {
      title: t.noGroupMembership,
      description: reason ?? t.noGroupMembershipDesc,
      icon: <ShieldOff className="h-14 w-14 text-debt" />,
      iconBg: "bg-debt/10",
      iconBorder: "border-debt/30",
      titleColor: "text-debt",
    },
  };

  const msg = messages[status ?? ""] ?? {
    title: t.tapReceived,
    description: t.tapProcessed,
    icon: <AlertCircle className="h-14 w-14 text-primary" />,
    iconBg: "bg-primary/10",
    iconBorder: "border-primary/30",
    titleColor: "text-primary",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm animate-scale-in text-center">
        <div className={`mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full ${msg.iconBg} border-2 ${msg.iconBorder}`}>
          {msg.icon}
        </div>
        <h1 className={`text-2xl font-bold ${msg.titleColor}`}>
          {msg.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {msg.description}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent active:scale-[0.98]"
        >
          {t.goToDashboard}
        </Link>
      </div>
    </div>
  );
}

export default function TapSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      }
    >
      <TapResult />
    </Suspense>
  );
}
