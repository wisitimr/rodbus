"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { useT } from "@/lib/i18n-context";

function TapResult() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const car = searchParams.get("car");
  const reason = searchParams.get("reason");

  const messages: Record<
    string,
    { title: string; description: string; color: string; icon: React.ReactNode }
  > = {
    recorded: {
      title: t.rideLogged,
      description: `${type} ${car ?? "the car"} ${t.rideRecorded}`,
      color: "green",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    already_recorded: {
      title: t.alreadyRecorded,
      description: `${car ?? "the car"} ${t.alreadyRecordedDesc}`,
      color: "blue",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    too_soon: {
      title: t.tooSoon,
      description: t.tooSoonDesc,
      color: "amber",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    disabled: {
      title: t.systemDisabled,
      description: reason ?? t.systemDisabledDesc,
      color: "red",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  };

  const msg = messages[status ?? ""] ?? {
    title: t.tapReceived,
    description: t.tapProcessed,
    color: "blue",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const bgMap: Record<string, string> = {
    green: "bg-green-50",
    blue: "bg-blue-50",
    amber: "bg-amber-50",
    red: "bg-red-50",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      <div className="animate-scale-in w-full max-w-sm overflow-hidden rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-gray-100 sm:p-10">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${bgMap[msg.color] ?? "bg-blue-50"}`}
        >
          {msg.icon}
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900">
          {msg.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {msg.description}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98] sm:w-auto sm:py-2.5"
        >
          {t.goToDashboard}
        </Link>
      </div>
    </main>
  );
}

export default function TapSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </main>
      }
    >
      <TapResult />
    </Suspense>
  );
}
