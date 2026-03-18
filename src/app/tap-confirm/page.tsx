"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useMemo } from "react";
import { Smartphone, Fuel, ParkingCircle, Users } from "lucide-react";
import { useT } from "@/lib/i18n-context";

interface AvailableTrip {
  id: string;
  tripNumber: number;
  checkInCount: number;
  gasCost: number;
  parkingCost: number;
}

function TapConfirm() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const carId = searchParams.get("carId");
  const car = searchParams.get("car");
  const tripsParam = searchParams.get("trips");
  const tripIdParam = searchParams.get("tripId");
  const [loading, setLoading] = useState(false);

  const trips: AvailableTrip[] = useMemo(() => {
    if (!tripsParam) return [];
    try {
      return JSON.parse(tripsParam);
    } catch {
      return [];
    }
  }, [tripsParam]);

  const hasMultipleTrips = trips.length > 1;
  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    // Prefer the tripId from the URL param if it exists in available trips
    if (tripIdParam && trips.some((t) => t.id === tripIdParam)) return tripIdParam;
    return trips[0]?.id ?? "";
  });

  const selectedTrip = trips.find((t) => t.id === selectedTripId);

  async function handleConfirm() {
    if (!carId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, tripId: selectedTripId }),
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

        {/* Car name + Trip number */}
        {car && (
          <div className="mt-4 rounded-xl bg-accent/50 p-4">
            <p className="text-lg font-semibold text-foreground">
              {car}
              {selectedTrip && (
                <span className="ml-2 text-primary">
                  {t.tripNumber} #{selectedTrip.tripNumber}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Trip selector — only shown when multiple trips */}
        {hasMultipleTrips && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t.selectTrip}
            </p>
            <div className="space-y-1.5">
              {trips.map((trip) => {
                const isSelected = selectedTripId === trip.id;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-accent/50"
                    }`}
                  >
                    {/* Radio indicator */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-input bg-background"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {t.tripNumber} #{trip.tripNumber}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {trip.checkInCount + 1} {t.people}
                        </span>
                        {trip.gasCost > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            ฿{trip.gasCost.toFixed(0)}
                          </span>
                        )}
                        {trip.parkingCost > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <ParkingCircle className="h-3 w-3" />
                            ฿{trip.parkingCost.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedTripId}
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
