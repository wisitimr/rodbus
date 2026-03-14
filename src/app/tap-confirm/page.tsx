"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Smartphone } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm animate-scale-in text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-12 w-12 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          {t.confirmCheckIn}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t.confirmCheckInDesc}
        </p>

        {/* Trip details */}
        {car && (
          <div className="mt-4 rounded-xl bg-accent/50 p-4">
            <p className="text-lg font-semibold text-foreground">{car}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                {t.confirm}
              </span>
            ) : (
              t.confirm
            )}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            disabled={loading}
            className="w-full rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent active:scale-[0.98]"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TapConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      }
    >
      <TapConfirm />
    </Suspense>
  );
}
