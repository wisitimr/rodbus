"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useT } from "@/lib/i18n-context";

function TapConfirm() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const carId = searchParams.get("carId");
  const car = searchParams.get("car");
  const tripId = searchParams.get("tripId");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!carId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, tripId }),
      });
      const data = await res.json();
      if (res.ok) {
        const params = new URLSearchParams({
          status: data.status,
          car: data.car,
        });
        router.push(`/tap-success?${params.toString()}`);
      } else {
        const params = new URLSearchParams({ status: data.error });
        if (data.car) params.set("car", data.car);
        router.push(`/tap-success?${params.toString()}`);
      }
    } catch {
      router.push("/tap-success?status=error");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div className="animate-scale-in relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-gray-100 sm:p-10">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900">
          {t.confirmCheckIn}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          {t.confirmCheckInDesc}
        </p>

        {/* Trip details */}
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-lg font-semibold text-gray-900">{car}</p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            disabled={loading}
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t.confirm}
              </span>
            ) : (
              t.confirm
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function TapConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </main>
      }
    >
      <TapConfirm />
    </Suspense>
  );
}
