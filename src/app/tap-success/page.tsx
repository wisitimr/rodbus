"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function TapResult() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const car = searchParams.get("car");

  const messages: Record<string, { title: string; description: string }> = {
    recorded: {
      title: "Ride Logged!",
      description: `Your ${type} ride in ${car ?? "the car"} has been recorded.`,
    },
    already_recorded: {
      title: "Already Recorded",
      description: `Your ride in ${car ?? "the car"} was already logged. No duplicate created.`,
    },
    too_soon: {
      title: "Too Soon for Evening",
      description: `Not enough time has passed since your morning tap in ${car ?? "the car"}. Try again later.`,
    },
  };

  const msg = messages[status ?? ""] ?? {
    title: "Tap Received",
    description: "Your tap has been processed.",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl">
          {status === "recorded" ? "\u2705" : "\u2139\uFE0F"}
        </div>
        <h1 className="mb-2 text-2xl font-bold">{msg.title}</h1>
        <p className="mb-6 text-gray-600">{msg.description}</p>
        <Link
          href="/dashboard"
          className="text-blue-600 underline hover:text-blue-800"
        >
          Go to Dashboard
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
          <p>Loading...</p>
        </main>
      }
    >
      <TapResult />
    </Suspense>
  );
}
